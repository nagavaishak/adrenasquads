import { NextResponse } from "next/server";
import { DEMO_PREDICTION_POOL } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ success: true, data: DEMO_PREDICTION_POOL });
}
