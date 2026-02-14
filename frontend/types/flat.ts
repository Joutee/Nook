export interface Flat {
  id: string;
  name: string;
  address: string;
}

export interface FlatMember {
  id: string;
  username: string;
  name: string | null;
  surname: string | null;
  role: string;
}
