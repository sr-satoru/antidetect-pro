"use client";

import { useEffect } from "react";

export function ReactGrabDev() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("react-grab").catch((err) => {
        console.warn("[React Grab] Falha ao inicializar:", err);
      });
    }
  }, []);

  return null;
}
