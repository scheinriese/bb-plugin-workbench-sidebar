import { mkdtempSync, mkdirSync, cpSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { experimental_scanPublicSdkOnly } from "@get-bb/plugin-sdk/testing";
import { expect, it } from "vitest";
it("uses only the public SDK and declared public packages in every distributed source", () => {
  const root = mkdtempSync(join(tmpdir(), "workbench-sdk-"));
  try {
    // Scan the distribution inputs, including all tests and vendored UI. Ignore
    // local downloaded reference archives and the isolated running BB instance.
    for (const path of [
      "app",
      "shared",
      "vendor",
      "app.tsx",
      "server.ts",
      "app.test.tsx",
      "server.test.ts",
      "sidebarRowRenders.test.tsx",
      "package.json",
      "vitest.config.ts",
      "public-sdk.test.ts",
    ])
      cpSync(path, join(root, path), { recursive: true });
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    const names = [
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
    ];
    const allow = [
      /^@\//u,
      ...names
        .filter((name) => name !== "@get-bb/plugin-sdk")
        .map(
          (name) =>
            new RegExp(
              `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`,
            ),
        ),
    ];
    const scan = experimental_scanPublicSdkOnly(root, { allow });
    expect(scan.privateDependencies).toEqual([]);
    expect(scan.violations).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
