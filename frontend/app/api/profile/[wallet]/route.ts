import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;
  return NextResponse.json({
    success: true,
    data: {
      wallet,
      competitions_entered: 3,
      total_pnl: 1248.50,
      best_rank: 2,
      squad_name: "Liquidation Hunters",
      badges: ["Top 3 Finish", "Prediction Ace", "First Blood"],
    },
  });
}
