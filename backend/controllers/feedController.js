const mongoose = require("mongoose");
const { Feed } = require("../models/Feed");
const { FeedComment } = require("../models/FeedComment");
const { getFullImageUrl } = require("../helperUtils/imageHelper");

const {
  sendResponse,
  validateParams,
  parsePaginationParams,
  generateMeta,
} = require("../helperUtils/responseUtil");

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const parseImagesArray = (value) => {
  if (!value) {
    return [];
  }

  let parsedValue = value;

  if (typeof value === "string") {
    try {
      parsedValue = JSON.parse(value);
    } catch (error) {
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      file: String(item.file || "").trim(),
      fileExtension: String(item.fileExtension || "").trim(),
    }))
    .filter((item) => item.file && item.fileExtension);
};

const formatFeedImages = (images = []) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images.map((image) => ({
    ...image,
    fileUrl: getFullImageUrl(image.file),
  }));
};

const formatFeedResponse = (feed) => {
  if (!feed) {
    return null;
  }

  return {
    ...feed,
    images: formatFeedImages(feed.images),
    user: feed.user
      ? {
          ...feed.user,
          profileIcon: getFullImageUrl(feed.user.profileIcon),
        }
      : null,
  };
};

const formatFeedsResponse = (feeds = []) => {
  if (!Array.isArray(feeds)) {
    return [];
  }

  return feeds.map(formatFeedResponse);
};

const buildFeedProjectionStages = (
  currentUserId,
  { includeComments = false } = {},
) => {
  const currentUserObjectId = toObjectId(currentUserId);

  const stages = [
    {
      $lookup: {
        from: "users",
        let: {
          userId: "$user",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$userId"],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              username: 1,
              profileIcon: 1,
              belt: 1,
            },
          },
        ],
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $addFields: {
        likes: { $ifNull: ["$likes", []] },
        shares: { $ifNull: ["$shares", []] },
        reposts: { $ifNull: ["$reposts", []] },
        savedBy: { $ifNull: ["$savedBy", []] },
      },
    },
    {
      $lookup: {
        from: "feedcomments",
        let: {
          feedId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$feed", "$$feedId"] },
                  { $eq: ["$isDeleted", false] },
                ],
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "commentStats",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        commentCount: {
          $ifNull: [{ $arrayElemAt: ["$commentStats.count", 0] }, 0],
        },
        shareCount: { $size: "$shares" },
        repostCount: { $size: "$reposts" },
        savedCount: { $size: "$savedBy" },
        isLiked: { $in: [currentUserObjectId, "$likes"] },
        isSaved: { $in: [currentUserObjectId, "$savedBy"] },
        isShared: { $in: [currentUserObjectId, "$shares"] },
        isReposted: { $in: [currentUserObjectId, "$reposts"] },
      },
    },
  ];

  if (includeComments) {
    stages.push({
      $lookup: {
        from: "feedcomments",
        let: {
          feedId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$feed", "$$feedId"] },
                  { $eq: ["$isDeleted", false] },
                ],
              },
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $lookup: {
              from: "users",
              let: {
                commentUserId: "$user",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$_id", "$$commentUserId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    username: 1,
                    profileIcon: 1,
                    belt: 1,
                  },
                },
              ],
              as: "user",
            },
          },
          {
            $unwind: "$user",
          },
          {
            $project: {
              _id: 1,
              comment: 1,
              createdAt: 1,
              updatedAt: 1,
              user: {
                _id: "$user._id",
                name: "$user.name",
                username: "$user.username",
                profileIcon: "$user.profileIcon",
                belt: "$user.belt",
              },
            },
          },
        ],
        as: "comments",
      },
    });
  } else {
    stages.push({
      $addFields: {
        comments: [],
      },
    });
  }

  stages.push({
    $project: {
      content: 1,
      images: 1,
      createdAt: 1,
      updatedAt: 1,
      likeCount: 1,
      commentCount: 1,
      shareCount: 1,
      repostCount: 1,
      savedCount: 1,
      isLiked: 1,
      isSaved: 1,
      isShared: 1,
      isReposted: 1,
      comments: 1,
      user: {
        _id: "$user._id",
        name: "$user.name",
        username: "$user.username",
        profileIcon: "$user.profileIcon",
        belt: "$user.belt",
      },
    },
  });

  return stages;
};

const getAggregatedFeedById = async (feedId, currentUserId) => {
  const result = await Feed.aggregate([
    {
      $match: {
        _id: toObjectId(feedId),
        isDeleted: false,
      },
    },
    ...buildFeedProjectionStages(currentUserId, { includeComments: true }),
  ]);

  return formatFeedResponse(result[0] || null);
};

const createFeed = async (req, res) => {
  try {
    const content = req.body.content?.trim() || "";
    const images = parseImagesArray(req.body.images);

    if (!content && images.length === 0) {
      return sendResponse({
        res,
        statusCode: 400,
        translationKey: "feed_content_required",
      });
    }

    const feed = await Feed.create({
      user: req.user._id,
      content,
      images,
    });

    const data = await getAggregatedFeedById(feed._id, req.user._id);

    return sendResponse({
      res,
      statusCode: 201,
      translationKey: "feed_created_successfully",
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: error.name === "ValidationError" ? 400 : 500,
      translationKey:
        error.name === "ValidationError"
          ? Object.values(error.errors)[0].message
          : "an_error_occurred_while_creating_feed",
      error,
    });
  }
};

const updateFeed = async (req, res) => {
  const validationOptions = {
    pathParams: ["feedId"],
    objectIdFields: ["feedId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const feed = await Feed.findOne({
      _id: req.params.feedId,
      user: req.user._id,
      isDeleted: false,
    });

    if (!feed) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    const content =
      req.body.content !== undefined ? req.body.content.trim() : feed.content;

    const images =
      req.body.images !== undefined
        ? parseImagesArray(req.body.images)
        : feed.images;

    if (!content && images.length === 0) {
      return sendResponse({
        res,
        statusCode: 400,
        translationKey: "feed_content_required",
      });
    }

    feed.content = content;
    feed.images = images;

    await feed.save();

    const data = await getAggregatedFeedById(feed._id, req.user._id);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "feed_updated_successfully",
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: error.name === "ValidationError" ? 400 : 500,
      translationKey:
        error.name === "ValidationError"
          ? Object.values(error.errors)[0].message
          : "an_error_occurred_while_updating_feed",
      error,
    });
  }
};

const getFeeds = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);

    const result = await Feed.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            ...buildFeedProjectionStages(req.user._id, {
              includeComments: true,
            }),
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const feeds = formatFeedsResponse(result[0]?.data || []);
    const total = result[0]?.total?.[0]?.count || 0;

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "feeds_fetched_successfully",
      data: feeds,
      meta: generateMeta(page, limit, total),
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_fetching_feeds",
      error,
    });
  }
};

const getFeedById = async (req, res) => {
  const validationOptions = {
    pathParams: ["feedId"],
    objectIdFields: ["feedId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const data = await getAggregatedFeedById(req.params.feedId, req.user._id);

    if (!data) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "feed_fetched_successfully",
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_fetching_feed",
      error,
    });
  }
};

const deleteFeed = async (req, res) => {
  const validationOptions = {
    pathParams: ["feedId"],
    objectIdFields: ["feedId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const feed = await Feed.findOneAndUpdate(
      {
        _id: req.params.feedId,
        user: req.user._id,
        isDeleted: false,
      },
      {
        $set: { isDeleted: true },
      },
      { new: true },
    );

    if (!feed) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "feed_deleted_successfully",
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_deleting_feed",
      error,
    });
  }
};

const toggleArrayField = async ({ req, res, field, successKey }) => {
  const validationOptions = {
    pathParams: ["feedId"],
    objectIdFields: ["feedId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const feed = await Feed.findOne({
      _id: req.params.feedId,
      isDeleted: false,
    });

    if (!feed) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    const exists = feed[field].some((item) => item.equals(req.user._id));

    await Feed.updateOne(
      { _id: feed._id },
      exists
        ? { $pull: { [field]: req.user._id } }
        : { $addToSet: { [field]: req.user._id } },
    );

    const data = await getAggregatedFeedById(feed._id, req.user._id);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: successKey,
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_updating_feed_interaction",
      error,
    });
  }
};

const toggleLikeFeed = async (req, res) =>
  toggleArrayField({
    req,
    res,
    field: "likes",
    successKey: "feed_like_updated_successfully",
  });

const toggleSaveFeed = async (req, res) =>
  toggleArrayField({
    req,
    res,
    field: "savedBy",
    successKey: "feed_save_updated_successfully",
  });

const shareFeed = async (req, res) =>
  toggleArrayField({
    req,
    res,
    field: "shares",
    successKey: "feed_share_updated_successfully",
  });

const repostFeed = async (req, res) =>
  toggleArrayField({
    req,
    res,
    field: "reposts",
    successKey: "feed_repost_updated_successfully",
  });

const addComment = async (req, res) => {
  const validationOptions = {
    pathParams: ["feedId"],
    objectIdFields: ["feedId"],
    rawData: ["comment"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const trimmedComment = req.body.comment?.trim();

    if (!trimmedComment) {
      return sendResponse({
        res,
        statusCode: 400,
        translationKey: "comment_required",
      });
    }

    const feed = await Feed.findOne({
      _id: req.params.feedId,
      isDeleted: false,
    }).select("_id");

    if (!feed) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    await FeedComment.create({
      feed: feed._id,
      user: req.user._id,
      comment: trimmedComment,
    });

    const data = await getAggregatedFeedById(feed._id, req.user._id);

    return sendResponse({
      res,
      statusCode: 201,
      translationKey: "feed_comment_added_successfully",
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: error.name === "ValidationError" ? 400 : 500,
      translationKey:
        error.name === "ValidationError"
          ? Object.values(error.errors)[0].message
          : "an_error_occurred_while_adding_comment",
      error,
    });
  }
};

const deleteComment = async (req, res) => {
  const validationOptions = {
    pathParams: ["feedId", "commentId"],
    objectIdFields: ["feedId", "commentId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const [feed, comment] = await Promise.all([
      Feed.findOne({
        _id: req.params.feedId,
        isDeleted: false,
      }).select("_id user"),
      FeedComment.findOne({
        _id: req.params.commentId,
        feed: req.params.feedId,
        isDeleted: false,
      }),
    ]);

    if (!feed) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "feed_not_found",
      });
    }

    if (!comment) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "comment_not_found",
      });
    }

    const canDelete =
      comment.user.equals(req.user._id) || feed.user.equals(req.user._id);

    if (!canDelete) {
      return sendResponse({
        res,
        statusCode: 403,
        translationKey: "unauthorized_to_delete_comment",
      });
    }

    comment.isDeleted = true;
    await comment.save();

    const data = await getAggregatedFeedById(feed._id, req.user._id);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "feed_comment_deleted_successfully",
      data,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_deleting_comment",
      error,
    });
  }
};

module.exports = {
  createFeed,
  getFeeds,
  getFeedById,
  updateFeed,
  deleteFeed,
  toggleLikeFeed,
  toggleSaveFeed,
  shareFeed,
  repostFeed,
  addComment,
  deleteComment,
};
