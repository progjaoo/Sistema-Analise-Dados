import type { AppUser } from "../types.js";

declare global {
  namespace Express {
    interface Request { user?: AppUser; }
  }
}

export {};
