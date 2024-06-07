const express = require('express');
const axios = require('axios');
const yts = require('yt-search');

const app = express();
const PORT = 3000;
const YOUTUBE_API_KEY = 'AIzaSyBn7qBpnq1dy1RbPJ8t_BsIHz6ESoR00i4';  // Replace with your YouTube Data API key

app.get('/api/videoinfo/v3', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).send('Query parameter is missing');
  }

  try {
    const searchResults = await yts(query);
    if (!searchResults || !searchResults.videos.length) {
      return res.status(404).send('No videos found');
    }

    const video = searchResults.videos[0]; // Select the first video
    const videoDetails = await fetchVideoDetails(video);

    res.json(videoDetails);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while processing your request');
  }
});

async function fetchVideoDetails(video) {
  const videoId = video.videoId;

  const videoInfoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'snippet,contentDetails,statistics,liveStreamingDetails',
      id: videoId,
      key: YOUTUBE_API_KEY
    }
  });

  const videoItem = videoInfoResponse.data.items[0];
  const channelId = videoItem.snippet.channelId;

  const channelInfoResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'snippet,statistics,brandingSettings,contentDetails',
      id: channelId,
      key: YOUTUBE_API_KEY
    }
  });

  const categoriesResponse = await axios.get('https://www.googleapis.com/youtube/v3/videoCategories', {
    params: {
      part: 'snippet',
      regionCode: 'US', // You can change this to the region you are interested in
      key: YOUTUBE_API_KEY
    }
  });

  const categoriesMap = categoriesResponse.data.items.reduce((acc, category) => {
    acc[category.id] = category.snippet.title;
    return acc;
  }, {});

  const channelInfo = channelInfoResponse.data.items[0];

  return {
    videoId: videoItem.id,
    title: videoItem.snippet.title,
    description: videoItem.snippet.description,
    thumbnails: videoItem.snippet.thumbnails,
    publishedAt: videoItem.snippet.publishedAt,
    tags: videoItem.snippet.tags,
    category: categoriesMap[videoItem.snippet.categoryId] || 'Unknown',
    liveBroadcastContent: videoItem.snippet.liveBroadcastContent,
    duration: videoItem.contentDetails.duration,
    dimension: videoItem.contentDetails.dimension,
    definition: videoItem.contentDetails.definition,
    caption: videoItem.contentDetails.caption,
    licensedContent: videoItem.contentDetails.licensedContent,
    projection: videoItem.contentDetails.projection,
    viewCount: videoItem.statistics.viewCount,
    likeCount: videoItem.statistics.likeCount,
    dislikeCount: videoItem.statistics.dislikeCount,
    commentCount: videoItem.statistics.commentCount,
    liveStreamingDetails: videoItem.liveStreamingDetails,
    channel: {
      id: videoItem.snippet.channelId,
      title: videoItem.snippet.channelTitle,
      description: channelInfo.snippet.description,
      thumbnails: channelInfo.snippet.thumbnails,
      country: channelInfo.snippet.country,
      customUrl: channelInfo.snippet.customUrl,
      subscriberCount: channelInfo.statistics.subscriberCount,
      videoCount: channelInfo.statistics.videoCount,
      viewCount: channelInfo.statistics.viewCount,
      keywords: channelInfo.brandingSettings.channel.keywords,
      featuredChannelsUrls: channelInfo.brandingSettings.channel.featuredChannelsUrls,
      brandingSettings: {
        image: channelInfo.brandingSettings.image,
        relatedPlaylists: channelInfo.contentDetails.relatedPlaylists,
      }
    }
  };
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
