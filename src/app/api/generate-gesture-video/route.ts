import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// Gesture video prompts - clear demonstrations on black background
const GESTURE_PROMPTS: Record<string, string> = {
  pinch: `A realistic white 3D mannequin hand on a pure black background. The hand slowly brings the thumb and index finger together in a pinch gesture, holds the pinch for a moment, then drags horizontally to the right while maintaining the pinch. Smooth, deliberate motion. Clean studio lighting. Professional tutorial demonstration style.`,
  
  toggle: `A realistic white 3D mannequin hand on a pure black background. The hand starts as a closed fist, then slowly opens all five fingers fully spread, demonstrating a clear fist-to-open transition. Smooth, deliberate motion. Clean studio lighting. Professional tutorial demonstration style.`,
  
  photo: `Two realistic white 3D mannequin hands on a pure black background. Both hands form L-shapes with thumb and index finger extended, coming together to form a rectangular frame gesture like a camera viewfinder. Hold the frame pose, then a subtle flash effect. Smooth, deliberate motion. Clean studio lighting. Professional tutorial demonstration style.`,
};

async function generateVideoWithVeo(prompt: string): Promise<Buffer | null> {
  try {
    console.log("Starting Veo video generation...");
    
    // Start video generation request using Veo 3.1
    const response = await fetch(
      `${BASE_URL}/models/veo-3.1-generate-preview:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: prompt,
            },
          ],
          parameters: {
            aspectRatio: "16:9",
            durationSeconds: 4,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Veo API error:", error);
      return null;
    }

    const data = await response.json();
    const operationName = data.name;
    console.log("Operation started:", operationName);

    // Poll for completion
    let videoUri: string | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max wait

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusResponse = await fetch(
        `${BASE_URL}/${operationName}`,
        {
          headers: {
            "x-goog-api-key": GEMINI_API_KEY!,
          },
        }
      );

      if (!statusResponse.ok) {
        console.log("Status check failed, retrying...");
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      console.log("Status check:", statusData.done ? "done" : "in progress");

      if (statusData.done) {
        // Extract video URI from response
        const videoData = statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
        if (videoData?.uri) {
          videoUri = videoData.uri;
        }
        break;
      }

      attempts++;
    }

    if (!videoUri) {
      console.error("No video URI found after polling");
      return null;
    }

    console.log("Downloading video from:", videoUri);
    
    // Download the video with API key header
    const videoResponse = await fetch(videoUri, {
      headers: {
        "x-goog-api-key": GEMINI_API_KEY!,
      },
      redirect: "follow",
    });

    if (!videoResponse.ok) {
      console.error("Failed to download video:", videoResponse.status);
      return null;
    }

    return Buffer.from(await videoResponse.arrayBuffer());
  } catch (error) {
    console.error("Error generating video:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { gesture } = await request.json();

    if (!gesture || !GESTURE_PROMPTS[gesture]) {
      return NextResponse.json(
        { error: "Invalid gesture type. Valid types: pinch, toggle, photo" },
        { status: 400 }
      );
    }

    const prompt = GESTURE_PROMPTS[gesture];
    const videoBuffer = await generateVideoWithVeo(prompt);

    if (!videoBuffer) {
      return NextResponse.json(
        { error: "Failed to generate video" },
        { status: 500 }
      );
    }

    const fileName = `${gesture}.mp4`;
    const filePath = join(process.cwd(), "public", "gestures", fileName);

    await writeFile(filePath, videoBuffer);

    return NextResponse.json({
      success: true,
      path: `/gestures/${fileName}`,
    });
  } catch (error) {
    console.error("Error in generate-gesture-video:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to generate all gesture videos sequentially
export async function GET() {
  const results: Record<string, string | null> = {};

  for (const gesture of Object.keys(GESTURE_PROMPTS)) {
    console.log(`\n========== Generating video for: ${gesture} ==========`);
    
    try {
      const videoBuffer = await generateVideoWithVeo(GESTURE_PROMPTS[gesture]);
      
      if (videoBuffer) {
        const fileName = `${gesture}.mp4`;
        const filePath = join(process.cwd(), "public", "gestures", fileName);
        await writeFile(filePath, videoBuffer);
        results[gesture] = `/gestures/${fileName}`;
        console.log(`✓ Successfully generated: ${fileName}`);
      } else {
        results[gesture] = null;
        console.log(`✗ Failed to generate: ${gesture}`);
      }
    } catch (error) {
      console.error(`Error generating ${gesture}:`, error);
      results[gesture] = null;
    }
  }

  return NextResponse.json({ results });
}
