"use client";

import { useState } from "react";

export function MemberListAvatar({
  memberId,
  firstName,
  lastName,
  hasPhoto,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  hasPhoto: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border">
      {hasPhoto && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/members/${memberId}/photo`}
          alt={`${firstName} ${lastName}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-primary text-xs font-semibold">{initials}</span>
      )}
    </div>
  );
}
