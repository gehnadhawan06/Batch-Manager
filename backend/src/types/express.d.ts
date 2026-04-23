declare namespace Express {
  interface Request {
    user?: {
      userId: number;
      role: "STUDENT" | "TEACHER" | "ADMIN";
    };
  }
}
