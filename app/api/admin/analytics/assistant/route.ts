import { POST as handler } from "./handlers";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export const POST = handler;
