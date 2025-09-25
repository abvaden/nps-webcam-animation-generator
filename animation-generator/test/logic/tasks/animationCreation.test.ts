// Unit tests for createTodaysAnimations in src/tasks/animationCreation.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTodaysAnimations } from "../../../src/tasks/animationCreation";
import { WebcamDto } from "../../../src/db/schema";
import { AnimationQueueEntry } from "../../../src/types/index";

describe("createTodaysAnimations (integration, no mocks for solar/storage/date)", () => {
  let repo: any;
  let webcam: WebcamDto;

  beforeEach(() => {
    repo = {
      getEnabledWebcams: vi.fn(),
      addAnimationsToQueue: vi.fn(),
    };
    webcam = {
      id: 1,
      name: "Denver Cam",
      url: "https://example.com/webcam.jpg",
      enabled: true,
      intervalMinutes: 60,
      location: "Denver, CO",
      nationalPark: "Rocky Mountain",
      timezone: "America/Denver",
      lastImageHash: null,
      displayName: "Denver Cam",
      latLon: "39.740,-104.975",
      lastActiveAt: "2025-09-23T12:00:00Z",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-09-23T12:00:00Z"
    };
    vi.clearAllMocks();
  });

  it("creates all animation types for a valid webcam and date using real solar/storage/date logic", async () => {
    repo.getEnabledWebcams.mockResolvedValue([webcam]);
    repo.addAnimationsToQueue.mockResolvedValue(true);

    await createTodaysAnimations(repo, "2025-09-24");

    expect(repo.addAnimationsToQueue).toHaveBeenCalledTimes(1);
    const animations: AnimationQueueEntry[] = repo.addAnimationsToQueue.mock.calls[0][0];

    // Should include sunrise, sunset, full_day, and hourly animations
    const types = animations.map(a => a.gif_type);
    expect(types).toContain("sunrise");
    expect(types).toContain("sunset");
    expect(types).toContain("full_day");
    expect(types).toContain("hourly");

    // Should set correct date_key
    animations.forEach(a => {
      expect(a.date_key).toBe("2025-09-24");
    });

    // Should set correct status
    animations.forEach(a => {
      expect(a.status).toBe("waiting_for_images");
    });

    // Should have valid reference_id and gif_storage_key
    animations.forEach(a => {
      expect(a.reference_id).toMatch(/^1_(sunrise|sunset|full_day|hourly)_20250924/);
      expect(typeof a.gif_storage_key).toBe("string");
      expect(a.gif_storage_key && a.gif_storage_key.length).toBeGreaterThan(0);
    });

    // Should have scheduled_time in ISO format
    animations.forEach(a => {
      expect(typeof a.scheduled_time).toBe("string");
      expect(a.scheduled_time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it("skips webcams with missing latLon", async () => {
    const badWebcam = { ...webcam, latLon: null };
    repo.getEnabledWebcams.mockResolvedValue([badWebcam]);
    repo.addAnimationsToQueue.mockResolvedValue(true);

    await createTodaysAnimations(repo, "2025-09-24");
    expect(repo.addAnimationsToQueue).not.toHaveBeenCalled();
  });

  it("skips webcams with missing timezone", async () => {
    const badWebcam = { ...webcam, timezone: null };
    repo.getEnabledWebcams.mockResolvedValue([badWebcam]);
    repo.addAnimationsToQueue.mockResolvedValue(true);

    await createTodaysAnimations(repo, "2025-09-24");
    expect(repo.addAnimationsToQueue).not.toHaveBeenCalled();
  });

  it("throws error for invalid date format", async () => {
    repo.getEnabledWebcams.mockResolvedValue([webcam]);
    await expect(createTodaysAnimations(repo, "20250924")).rejects.toThrow("invalid date must be (YYYY-MM-DD)");
    await expect(createTodaysAnimations(repo, "09-24-2025")).rejects.toThrow("invalid date must be (YYYY-MM-DD)");
    await expect(createTodaysAnimations(repo, "2025/09/24")).rejects.toThrow("invalid date must be (YYYY-MM-DD)");
  });

  it("does nothing if no webcams are enabled", async () => {
    repo.getEnabledWebcams.mockResolvedValue([]);
    await createTodaysAnimations(repo, "2025-09-24");
    expect(repo.addAnimationsToQueue).not.toHaveBeenCalled();
  });

  it("handles database failure gracefully", async () => {
    repo.getEnabledWebcams.mockResolvedValue([webcam]);
    repo.addAnimationsToQueue.mockResolvedValue(false);

    // Should not throw, just log failure
    await expect(createTodaysAnimations(repo, "2025-09-24")).resolves.not.toThrow();
    expect(repo.addAnimationsToQueue).toHaveBeenCalled();
  });

  it("verifies correct reference_id format for different animation types", async () => {
    repo.getEnabledWebcams.mockResolvedValue([webcam]);
    repo.addAnimationsToQueue.mockResolvedValue(true);

    await createTodaysAnimations(repo, "2025-09-24");
    const animations: AnimationQueueEntry[] = repo.addAnimationsToQueue.mock.calls[0][0];

    const sunrise = animations.find(a => a.gif_type === "sunrise");
    const sunset = animations.find(a => a.gif_type === "sunset");
    const fullDay = animations.find(a => a.gif_type === "full_day");
    const hourly = animations.filter(a => a.gif_type === "hourly");

    expect(sunrise?.reference_id).toBe("1_sunrise_20250924");
    expect(sunset?.reference_id).toBe("1_sunset_20250924");
    expect(fullDay?.reference_id).toBe("1_full_day_20250924");

    // Hourly animations should include hour in reference_id
    hourly.forEach(h => {
      expect(h.reference_id).toMatch(/^1_hourly_20250924_\d{2}$/);
    });
  });
});
