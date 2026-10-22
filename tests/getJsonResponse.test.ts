import { describe, expect, it } from "vitest";
import { getJsonResponse } from "../src/utils/getJsonResponse.js";

describe("getJsonResponse", () => {
  it("always includes the success flag", () => {
    expect(getJsonResponse({ success: true })).toEqual({ success: true });
    expect(getJsonResponse({ success: false })).toEqual({ success: false });
  });

  it("keeps success: false as an own property rather than dropping it", () => {
    const result = getJsonResponse({ success: false });

    expect(Object.keys(result)).toEqual(["success"]);
    expect(result.success).toBe(false);
  });

  it("includes only success and message when only message is provided", () => {
    expect(getJsonResponse({ success: true, message: "Success" })).toEqual({
      success: true,
      message: "Success",
    });
  });

  it("includes only success and data when only data is provided", () => {
    expect(getJsonResponse({ success: true, data: { id: 1 } })).toEqual({
      success: true,
      data: { id: 1 },
    });
  });

  it("includes only success and additionalInfo when only additionalInfo is provided", () => {
    expect(
      getJsonResponse({ success: true, additionalInfo: { page: 1 } }),
    ).toEqual({
      success: true,
      additionalInfo: { page: 1 },
    });
  });

  it("includes only success and error when only error is provided", () => {
    expect(
      getJsonResponse({ success: false, error: "Something went wrong" }),
    ).toEqual({
      success: false,
      error: "Something went wrong",
    });
  });

  it("includes all properties together when all are provided", () => {
    expect(
      getJsonResponse({
        success: true,
        message: "Done",
        data: { id: 1 },
        additionalInfo: { total: 10 },
        error: "none",
      }),
    ).toEqual({
      success: true,
      message: "Done",
      data: { id: 1 },
      additionalInfo: { total: 10 },
      error: "none",
    });
  });

  it("omits properties that were not provided, rather than including them as undefined", () => {
    const result = getJsonResponse({ success: true, message: "Only this" });

    expect(result).toEqual({ success: true, message: "Only this" });
    expect("data" in result).toBe(false);
    expect("additionalInfo" in result).toBe(false);
    expect("error" in result).toBe(false);
  });

  it("omits properties explicitly passed as undefined", () => {
    const result = getJsonResponse({
      success: true,
      message: undefined,
      data: undefined,
    });

    expect(Object.keys(result)).toEqual(["success"]);
  });

  it("preserves data: null instead of dropping it", () => {
    expect(getJsonResponse({ success: true, data: null })).toEqual({
      success: true,
      data: null,
    });
  });

  it("preserves data: 0 instead of dropping it", () => {
    expect(getJsonResponse({ success: true, data: 0 })).toEqual({
      success: true,
      data: 0,
    });
  });

  it("preserves data: false instead of dropping it", () => {
    expect(getJsonResponse({ success: true, data: false })).toEqual({
      success: true,
      data: false,
    });
  });

  it("preserves data: '' instead of dropping it", () => {
    expect(getJsonResponse({ success: true, data: "" })).toEqual({
      success: true,
      data: "",
    });
  });

  it("preserves additionalInfo: 0 instead of dropping it", () => {
    expect(getJsonResponse({ success: true, additionalInfo: 0 })).toEqual({
      success: true,
      additionalInfo: 0,
    });
  });

  it("preserves additionalInfo: false instead of dropping it", () => {
    expect(getJsonResponse({ success: true, additionalInfo: false })).toEqual(
      {
        success: true,
        additionalInfo: false,
      },
    );
  });

  it("preserves additionalInfo: '' instead of dropping it", () => {
    expect(getJsonResponse({ success: true, additionalInfo: "" })).toEqual({
      success: true,
      additionalInfo: "",
    });
  });

  it("preserves an empty message string instead of dropping it", () => {
    expect(getJsonResponse({ success: true, message: "" })).toEqual({
      success: true,
      message: "",
    });
  });

  it("builds correctly with typed generics for data and additionalInfo", () => {
    type Data = { id: number; name: string };
    type Info = { page: number };

    const result = getJsonResponse<Data, Info>({
      success: true,
      data: { id: 1, name: "Ada" },
      additionalInfo: { page: 2 },
    });

    expect(result.data).toEqual({ id: 1, name: "Ada" });
    expect(result.additionalInfo).toEqual({ page: 2 });
  });
});
