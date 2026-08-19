import { NextResponse } from "next/server";
import { z } from "zod";
import { createManualPrinciple } from "@/lib/db/principle-queries";
import { listPrinciplesWithProvenance } from "@/lib/principles/registry";
import { getWorkspaceUser } from "@/lib/workspace-user";
const createSchema = z.object({ description:z.string().trim().max(5000).optional(), statement:z.string().trim().min(1).max(2000) });
export async function GET(){ const workspaceUser=await getWorkspaceUser(); return NextResponse.json({principles:await listPrinciplesWithProvenance(workspaceUser.id)}); }
export async function POST(request:Request){ const parsed=createSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:"Invalid principle."},{status:400}); const workspaceUser=await getWorkspaceUser(); const created=await createManualPrinciple({description:parsed.data.description,statement:parsed.data.statement,userId:workspaceUser.id}); return NextResponse.json({principle:created},{status:201}); }
