import { describe, expect, it } from "vitest";
import { getJsonResponse } from "../src/utils/getJsonResponse.js";

describe("getJsonResponse", () => {
  it("includes only the message when only message is provided", () => {
    expect(getJsonResponse({ message: "Success" })).toEqual({
      message: "Success",
    });
  });

  it("includes only data when only data is provided", () => {
    expect(getJsonResponse({ data: { id: 1 } })).toEqual({
      data: { id: 1 },
    });
  });

  it("includes only additionalInfo when only additionalInfo is provided", () => {
    expect(getJsonResponse({ additionalInfo: { page: 1 } })).toEqual({
      additionalInfo: { page: 1 },
    });
  });

  it("includes only error when only error is provided", () => {
    expect(getJsonResponse({ error: "Something went wrong" })).toEqual({
      error: "Something went wrong",
    });
  });

  it("includes all properties together when all are provided", () => {
    expect(
      getJsonResponse({
        message: "Done",
        data: { id: 1 },
        additionalInfo: { total: 10 },
        error: "none",
      }),
    ).toEqual({
      message: "Done",
      data: { id: 1 },
      additionalInfo: { total: 10 },
      error: "none",
    });
  });

  it("omits properties that were not provided, rather than including them as undefined", () => {
    const result = getJsonResponse({ message: "Only this" });

    expect(result).toEqual({ message: "Only this" });
    expect("data" in result).toBe(false);
    expect("additionalInfo" in result).toBe(false);
    expect("error" in result).toBe(false);
  });

  it("preserves data: 0 instead of dropping it", () => {
    expect(getJsonResponse({ data: 0 })).toEqual({ data: 0 });
  });

  it("preserves data: false instead of dropping it", () => {
    expect(getJsonResponse({ data: false })).toEqual({ data: false });
  });

  it("preserves data: '' instead of dropping it", () => {
    expect(getJsonResponse({ data: "" })).toEqual({ data: "" });
  });

  it("preserves additionalInfo: 0 instead of dropping it", () => {
    expect(getJsonResponse({ additionalInfo: 0 })).toEqual({
      additionalInfo: 0,
    });
  });

  it("preserves additionalInfo: false instead of dropping it", () => {
    expect(getJsonResponse({ additionalInfo: false })).toEqual({
      additionalInfo: false,
    });
  });

  it("preserves additionalInfo: '' instead of dropping it", () => {
    expect(getJsonResponse({ additionalInfo: "" })).toEqual({
      additionalInfo: "",
    });
  });

  it("returns an empty object when no properties are provided", () => {
    expect(getJsonResponse({})).toEqual({});
  });

  it("builds correctly with typed generics for data and additionalInfo", () => {
    type Data = { id: number; name: string };
    type Info = { page: number };

    const result = getJsonResponse<Data, Info>({
      data: { id: 1, name: "Ada" },
      additionalInfo: { page: 2 },
    });

    expect(result.data).toEqual({ id: 1, name: "Ada" });
    expect(result.additionalInfo).toEqual({ page: 2 });
  });
});
