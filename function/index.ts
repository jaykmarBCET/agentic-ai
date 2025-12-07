import { InferenceClient } from "@huggingface/inference";
import {
    getVideoDetails,
    VideoDetails,
} from 'youtube-caption-extractor';



const fetchVideoDetails = async (
    videoID: string,
    lang = 'en'
): Promise<VideoDetails> => {
    try {
        const details: VideoDetails = await getVideoDetails({ videoID, lang });
        return details;
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
};

export const getVideoInfo = async (videoId: string) => {

    try {
        const response = await fetchVideoDetails(videoId);
        let videoDetail = `
        # Video Details
          ### title
          ${response.title}
          ### Description
          ${response.description}
          ### subtitles
          ${response.subtitles.join(", ")}
        `

        return videoDetail

    } catch (error) {
        console.log(error)
        return
    }


}




const client = new InferenceClient(process.env.HF_TOKEN);



export const generateImageUrl = async (prompt: string): Promise<string | null> => {
  try {
    const imageBlob = await client.textToImage({
      model: "black-forest-labs/FLUX.1-dev",
      inputs: prompt,
      parameters: { width: 1024, height: 768 }
    });

    // Convert Blob → ArrayBuffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Make Data URL
    return `data:image/png;base64,${base64}`;

  } catch (error) {
    console.error("HF Error → Switching to Pollinations:", error);

    const cleanPrompt = encodeURIComponent(prompt.trim());
    return `https://image.pollinations.ai/prompt/${cleanPrompt}?model=flux&width=1024&height=768&nologo=true`;
  }
};
