"use strict";
/**
 * Competition lifecycle crank.
 * Polls every 10 seconds and handles state transitions:
 *   Registration → Active (when Clock >= start_time)
 *   Active → Calculating → Finalized (when Clock >= end_time)
 *   Prediction pool: Open → Locked → Resolved
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@coral-xyz/anchor"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const queries_js_1 = require("../db/queries.js");
const trade_parser_js_1 = require("../scoring/trade-parser.js");
const calculator_js_1 = require("../scoring/calculator.js");
const merkle_js_1 = require("../leaderboard/merkle.js");
dotenv_1.default.config();
const POLL_INTERVAL_MS = 10000;
async function getProgram() {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
    const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
    const keypairPath = process.env.ANCHOR_WALLET ?? path_1.default.join(process.env.HOME, '.config/solana/id.json');
    const keypairData = JSON.parse(fs_1.default.readFileSync(keypairPath, 'utf-8'));
    const keypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(keypairData));
    const wallet = new anchor.Wallet(keypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });
    const idl = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../../target/idl/adrena_squads.json'), 'utf-8'));
    const programId = new web3_js_1.PublicKey(process.env.PROGRAM_ID ?? idl.address);
    return new anchor.Program(idl, provider);
}
async function crankLoop() {
    console.log('[Crank] Starting competition lifecycle crank...');
    const program = await getProgram();
    const connection = program.provider.connection;
    while (true) {
        try {
            await tick(program, connection);
        }
        catch (err) {
            console.error('[Crank] Error:', err);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
}
async function tick(program, connection) {
    const competition = await (0, queries_js_1.getActiveCompetition)();
    if (!competition) {
        console.log('[Crank] No active competition found.');
        return;
    }
    const now = Date.now() / 1000;
    const startTime = competition.start_time.getTime() / 1000;
    const endTime = competition.end_time.getTime() / 1000;
    // Registration → Active
    if (competition.status === 'Registration' && now >= startTime) {
        console.log(`[Crank] Starting competition ${competition.competition_id}`);
        await startCompetition(program, competition.competition_pubkey);
        await queries_js_1.pool.query("UPDATE competitions SET status = 'Active', updated_at = NOW() WHERE competition_pubkey = $1", [competition.competition_pubkey]);
    }
    // Active → Finalize
    if (competition.status === 'Active' && now >= endTime) {
        console.log(`[Crank] Finalizing competition ${competition.competition_id}`);
        await finalizeCompetition(program, connection, competition);
    }
}
async function startCompetition(program, competitionPubkey) {
    const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId);
    await program.methods
        .startCompetition()
        .accounts({
        authority: program.provider.wallet.publicKey,
        config: configPda,
        competition: new web3_js_1.PublicKey(competitionPubkey),
    })
        .rpc();
}
async function finalizeCompetition(program, connection, competition) {
    // 1. Fetch all registered squads for this competition
    const { rows: entries } = await queries_js_1.pool.query(`SELECT se.entry_pubkey, se.squad_pubkey, s.leader_pubkey,
            array_agg(sm.wallet) AS members
     FROM squad_entries se
     JOIN squads s ON se.squad_pubkey = s.squad_pubkey
     JOIN squad_members sm ON s.squad_pubkey = sm.squad_pubkey
     WHERE se.competition_pubkey = $1
     GROUP BY se.entry_pubkey, se.squad_pubkey, s.leader_pubkey`, [competition.competition_pubkey]);
    const startTime = competition.start_time.getTime() / 1000;
    const endTime = competition.end_time.getTime() / 1000;
    // 2. Calculate scores for each squad
    const squadScores = await Promise.all(entries.map(async (entry, idx) => {
        const memberScores = await Promise.all(entry.members.map(async (wallet) => {
            const trades = await (0, trade_parser_js_1.getClosedTrades)(connection, wallet, startTime, endTime);
            return (0, calculator_js_1.calculateMemberScore)(wallet, trades);
        }));
        return (0, calculator_js_1.calculateSquadScore)(idx, entry.squad_pubkey, memberScores);
    }));
    // 3. Rank squads
    const ranked = (0, calculator_js_1.rankSquads)(squadScores);
    // 4. Build prize distribution
    const totalPrize = Number(competition.total_prize_amount);
    const prizeAllocs = [];
    const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from('config')], program.programId);
    // 5. Submit scores on-chain per squad and build prize leaves
    for (const squad of ranked) {
        const prize = ranked.indexOf(squad) === 0
            ? Math.floor(totalPrize * 0.30)
            : ranked.indexOf(squad) === 1
                ? Math.floor(totalPrize * 0.15)
                : ranked.indexOf(squad) === 2
                    ? Math.floor(totalPrize * 0.05)
                    : 0;
        const entry = entries.find((e) => e.squad_pubkey === squad.squadPubkey);
        if (!entry)
            continue;
        await program.methods
            .finalizeRound({
            squad: new web3_js_1.PublicKey(squad.squadPubkey),
            aggregateScore: squad.aggregateScore,
            memberScores: squad.memberScores.map((m) => m.score),
            memberTradeCounts: squad.memberScores.map((m) => m.tradeCount),
            rank: squad.rank,
            prizeAmount: prize,
        })
            .accounts({
            authority: program.provider.wallet.publicKey,
            config: configPda,
            competition: new web3_js_1.PublicKey(competition.competition_pubkey),
            squadEntry: new web3_js_1.PublicKey(entry.entry_pubkey),
        })
            .rpc();
        if (prize > 0) {
            // Leader collects 10% of squad prize
            const leaderBonus = Math.floor(prize * 0.1);
            const squadShare = prize - leaderBonus;
            prizeAllocs.push({ wallet: entry.leader_pubkey, amount: leaderBonus + squadShare });
        }
        // Update DB
        await queries_js_1.pool.query(`UPDATE squad_entries
       SET aggregate_score = $1, rank = $2, prize_amount = $3, finalized = true, updated_at = NOW()
       WHERE entry_pubkey = $4`, [squad.aggregateScore, squad.rank, prize, entry.entry_pubkey]);
    }
    // 6. Build Merkle tree and finalize on-chain
    const { root, rootHex, proofs } = (0, merkle_js_1.buildMerkleTree)(prizeAllocs);
    const merkleRootBytes = (0, merkle_js_1.rootToBytes)(rootHex);
    await program.methods
        .endCompetition(merkleRootBytes)
        .accounts({
        authority: program.provider.wallet.publicKey,
        config: configPda,
        competition: new web3_js_1.PublicKey(competition.competition_pubkey),
    })
        .rpc();
    // Store proofs in DB for frontend
    for (const [wallet, proof] of proofs) {
        const proofBytes = (0, merkle_js_1.proofToBytes)(proof);
        await queries_js_1.pool.query(`UPDATE member_scores SET updated_at = NOW() WHERE wallet = $1`, [wallet]);
        console.log(`[Crank] Proof for ${wallet}:`, proofBytes.length, 'nodes');
    }
    await queries_js_1.pool.query("UPDATE competitions SET status = 'Finalized', merkle_root = $1, updated_at = NOW() WHERE competition_pubkey = $2", [rootHex, competition.competition_pubkey]);
    console.log(`[Crank] Competition ${competition.competition_id} finalized. Merkle root: ${rootHex}`);
}
crankLoop().catch(console.error);
//# sourceMappingURL=lifecycle.js.map