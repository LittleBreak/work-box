import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardContent } from "./card";

describe("Card", () => {
  // 正常路径
  it("renders Card with title and content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  // 边界条件：空内容
  it("renders empty Card without crashing", () => {
    render(<Card />);
    expect(document.querySelector("[class]")).toBeInTheDocument();
  });
});
