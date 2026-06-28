import { queryOne } from "./db";

export type ClubSettings = {
  club_name: string;
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  bic: string;
  bank_name: string;
  tax_number: string;
  register_number: string;
};

export async function getClubSettings(): Promise<ClubSettings> {
  const settings = await queryOne<ClubSettings>(
    "SELECT * FROM club_settings WHERE id=1"
  );
  return (
    settings ?? {
      club_name: "BoxClub",
      address: "",
      postal_code: "",
      city: "",
      phone: "",
      email: "",
      website: "",
      iban: "",
      bic: "",
      bank_name: "",
      tax_number: "",
      register_number: "",
    }
  );
}
