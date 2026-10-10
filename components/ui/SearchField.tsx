"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "./Field";

/** Search box that reports the trimmed text to `onSearch` after the user stops typing (default 300 ms). */
export function SearchField({
  id,
  label,
  placeholder,
  onSearch,
  delayMs = 300,
  className = "",
}: {
  id: string;
  label: string;
  placeholder?: string;
  onSearch: (q: string) => void;
  delayMs?: number;
  className?: string;
}) {
  const [text, setText] = useState("");
  const last = useRef("");
  const callback = useRef(onSearch);

  useEffect(() => {
    callback.current = onSearch;
  });

  useEffect(() => {
    const q = text.trim();
    if (q === last.current) return;
    const timer = setTimeout(() => {
      last.current = q;
      callback.current(q);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, delayMs]);

  return (
    <Field
      id={id}
      type="search"
      label={label}
      placeholder={placeholder}
      value={text}
      autoComplete="off"
      onChange={(e) => setText(e.target.value)}
      className={className}
    />
  );
}
