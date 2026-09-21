import { existsSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { programsData } from "@/roles/shared/data";
import ProgramsPage from "./page";

afterEach(cleanup);

function programCard(program: (typeof programsData)[number]) {
  return within(screen.getByRole("article", { name: program.title }));
}

async function expectProgramDocument(program: (typeof programsData)[number]) {
  const trigger = programCard(program).getByRole("button", {
    name: `ดูรายละเอียดหลักสูตร ${program.title}`,
  });

  fireEvent.click(trigger);

  const dialog = screen.getByRole("dialog", { name: program.title });
  expect(within(dialog).getByText(program.code)).toBeTruthy();
  expect(within(dialog).getByText(program.collegeFull)).toBeTruthy();
  expect(within(dialog).getByText("เอกสารสรุปหลักสูตร (PDF)")).toBeTruthy();

  const openLink = within(dialog).getByRole("link", {
    name: `เปิดเอกสารสรุปหลักสูตร ${program.title} PDF ในแท็บใหม่`,
  });
  expect(openLink.getAttribute("href")).toBe(program.document.url);
  expect(openLink.getAttribute("target")).toBe("_blank");
  expect(openLink.getAttribute("rel")).toContain("noopener");
  expect(openLink.getAttribute("rel")).toContain("noreferrer");

  const downloadLink = within(dialog).getByRole("link", {
    name: `ดาวน์โหลดเอกสารสรุปหลักสูตร ${program.title} PDF`,
  });
  expect(downloadLink.getAttribute("href")).toBe(program.document.url);
  expect(downloadLink.getAttribute("download")).toBe(program.document.fileName);

  fireEvent.click(within(dialog).getByRole("button", {
    name: `ปิดรายละเอียดหลักสูตร ${program.title}`,
  }));

  await waitFor(() => {
    expect(screen.queryByRole("dialog", { name: program.title })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
}

describe("student program documents", () => {
  it("shows the matching PDF in every program detail dialog", async () => {
    render(<ProgramsPage />);

    for (const program of programsData.slice(0, 3)) {
      await expectProgramDocument(program);
    }

    fireEvent.click(screen.getByRole("button", { name: "หน้า 2" }));

    for (const program of programsData.slice(3)) {
      await expectProgramDocument(program);
    }
  });

  it("keeps every configured program PDF in the public document directory", () => {
    const urls = programsData.map((program) => program.document.url);
    expect(new Set(urls).size).toBe(programsData.length);

    for (const program of programsData) {
      const publicPath = path.join(process.cwd(), "public", program.document.url.replace(/^\//, ""));
      expect(existsSync(publicPath), `${program.document.fileName} should exist`).toBe(true);
    }
  });
});
