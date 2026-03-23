import { NextResponse } from "next/server";
import { DEMO_SQUADS } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ success: true, data: DEMO_SQUADS });
}
