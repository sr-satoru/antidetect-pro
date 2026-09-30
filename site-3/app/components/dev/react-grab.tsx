"use client";

import { useEffect } from "react";

export function ReactGrabDev() {
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      import("react-grab")
        .then((m) => {
          console.log("[React Grab] Loaded successfully:", m);
        })
        .catch((err) => {
          console.warn("[React Grab] Falha ao inicializar:", err);
        });
    }
  }, []);

  return null;
}

