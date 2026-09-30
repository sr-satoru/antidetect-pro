import React from "react";
import { AccountOverview } from "@/app/components/account/account-overview";

export const metadata = {
  title: "Minha Conta — Star Multlogin",
  description: "Gerencie sua assinatura, backups em nuvem e chaves da API local do Star Multlogin.",
};

export default function AccountPage() {
  return (
    <div className="pt-8 sm:pt-12 pb-24">
      <div className="mx-auto max-w-[1060px] px-4 sm:px-6">
        <AccountOverview />
      </div>
    </div>
  );
}
