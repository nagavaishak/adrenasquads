import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

export const PROGRAM_ID  = new PublicKey("8tjeonB7WWE1S33jsXRMwmU8YhwsRGeAHa6b2Bze8Fwc");
export const CONFIG_PDA  = new PublicKey("HhK2RgjGSbi7fZjLUVnJH5zviufx9ju4DYvjNBdf57S2");
export const BOND_VAULT  = new PublicKey("FHvaSDmqojG8c6QzKihhGDV26uQPJrEQHTLWBhkVPYje");
export const USDC_MINT   = new PublicKey("WxKsUrqXn2BfD69Vnpu8xpBo83VwLbhZbPLbDqh4Szo");
export const DEVNET_RPC  = "https://api.devnet.solana.com";

// Discriminators from IDL
const CREATE_SQUAD_DISC  = Buffer.from([5, 221, 149, 143, 156, 81, 164, 46]);
const INIT_PROFILE_DISC  = Buffer.from([148, 35, 126, 247, 28, 169, 135, 175]);

function borshString(s: string): Buffer {
  const bytes = Buffer.from(s, "utf8");
  const len   = Buffer.allocUnsafe(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

export function getUserProfilePDA(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_profile"), user.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

// Config layout: [0:8] disc | [8:40] authority | [40:48] next_squad_id
export async function getNextSquadId(connection: Connection): Promise<bigint> {
  const info = await connection.getAccountInfo(CONFIG_PDA);
  if (!info) throw new Error("Config PDA not found on devnet");
  return info.data.readBigUInt64LE(40);
}

export function getSquadPDA(nextSquadId: bigint): PublicKey {
  const idBuf = Buffer.allocUnsafe(8);
  idBuf.writeBigUInt64LE(nextSquadId);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("squad"), idBuf],
    PROGRAM_ID
  );
  return pda;
}

export async function buildCreateSquadTxs(
  connection: Connection,
  leader: PublicKey,
  name: string,
  inviteOnly: boolean
): Promise<{ txs: Transaction[]; squadPDA: PublicKey }> {
  const userProfilePDA = getUserProfilePDA(leader);
  const profileInfo    = await connection.getAccountInfo(userProfilePDA);
  const txs: Transaction[] = [];

  // Init user profile if first time
  if (!profileInfo) {
    const tx = new Transaction().add(
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: leader,                            isSigner: true,  isWritable: true  },
          { pubkey: userProfilePDA,                    isSigner: false, isWritable: true  },
          { pubkey: SystemProgram.programId,           isSigner: false, isWritable: false },
        ],
        data: INIT_PROFILE_DISC,
      })
    );
    txs.push(tx);
  }

  // Build create_squad tx (with ATA creation if needed)
  const leaderATA  = await getAssociatedTokenAddress(USDC_MINT, leader);
  const ataInfo    = await connection.getAccountInfo(leaderATA);
  const nextId     = await getNextSquadId(connection);
  const squadPDA   = getSquadPDA(nextId);

  const ixs: TransactionInstruction[] = [];

  if (!ataInfo) {
    ixs.push(
      createAssociatedTokenAccountInstruction(leader, leaderATA, leader, USDC_MINT)
    );
  }

  ixs.push(
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: leader,                isSigner: true,  isWritable: true  },
        { pubkey: CONFIG_PDA,            isSigner: false, isWritable: true  },
        { pubkey: squadPDA,              isSigner: false, isWritable: true  },
        { pubkey: userProfilePDA,        isSigner: false, isWritable: true  },
        { pubkey: leaderATA,             isSigner: false, isWritable: true  },
        { pubkey: BOND_VAULT,            isSigner: false, isWritable: true  },
        { pubkey: TOKEN_PROGRAM_ID,      isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        CREATE_SQUAD_DISC,
        borshString(name),
        Buffer.from([inviteOnly ? 1 : 0]),
      ]),
    })
  );

  const createTx = new Transaction();
  ixs.forEach((ix) => createTx.add(ix));
  txs.push(createTx);

  return { txs, squadPDA };
}
