export type JwtPayload = {
  sub: string;
  email: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  householdId: string | null;
  avatarUrl: string | null;
};
