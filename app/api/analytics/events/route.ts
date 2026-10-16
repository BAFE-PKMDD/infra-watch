import { createCitizenEventPostHandler } from "./handlers";
export const runtime = "nodejs";
export const POST = createCitizenEventPostHandler();
