import { describe, expect, it } from "vitest";
import { fileExtension, formatBytes } from "./files";

describe("fileExtension", () => {
  it("returns the lowercase extension", () => {
    expect(fileExtension("src/app.tsx")).toBe("tsx");
    expect(fileExtension("Makefile")).toBe("");
    expect(fileExtension("README.md")).toBe("md");
  });

  it("handles dotfiles and paths without extensions", () => {
    expect(fileExtension(".env")).toBe("");
    expect(fileExtension("src/.gitignore")).toBe("");
    expect(fileExtension("src/lib/")).toBe("");
    expect(fileExtension("LICENSE")).toBe("");
  });
});

describe("formatBytes", () => {
  it("formats bytes and scaled units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(2500)).toBe("2.4 KB");
    expect(formatBytes(1520000)).toBe("1.4 MB");
  });

  it("returns a placeholder for invalid input", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-5)).toBe("—");
  });
});
