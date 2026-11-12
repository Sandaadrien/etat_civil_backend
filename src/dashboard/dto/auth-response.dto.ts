export interface GetMeResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
  agent: {
    id: string;
    is_active: boolean;
    role: unknown;
    centre: unknown;
    person: unknown;
  } | null;
  citizen: {
    id: string;
    national_unique_id: string;
  } | null;
}
