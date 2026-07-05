import { describe, it, expect } from "vitest";
import { formatTime } from "@/lib/utils";

describe("formatTime", () => {
  it("zero-pads both minutes and seconds", () => {
    expect(formatTime(489)).toBe("08:09");
  });

  it("rounds a fractional seconds value instead of truncating the decimal into the string", () => {
    expect(formatTime(489.32774999999998)).toBe("08:09");
  });

  it("rounds up across the seconds boundary", () => {
    expect(formatTime(59.6)).toBe("01:00");
  });

  it("formats zero as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats sub-minute durations with a zero-padded minute", () => {
    expect(formatTime(5)).toBe("00:05");
  });

  it("does not pad minutes beyond two digits", () => {
    expect(formatTime(605)).toBe("10:05");
  });
});
