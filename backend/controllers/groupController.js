const { Group } = require("../models/Group");
const {
  sendResponse,
  validateParams,
  parsePaginationParams,
  generateMeta,
} = require("../helperUtils/responseUtil");

const fetchPaginatedGroups = async (query, req, res, translationKey) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req);
    const [groups, total] = await Promise.all([
      Group.find(query).skip(skip).limit(limit),
      Group.countDocuments(query),
    ]);
    return sendResponse({
      res,
      statusCode: 200,
      translationKey,
      data: groups,
      meta: generateMeta(page, limit, total),
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: `an_error_occurred_while_fetching_${translationKey}`,
      error,
    });
  }
};

const getGroupsDashboard = async (req, res) => {
  const userId = req.user._id;
  try {
    const [myGroups, followedGroups, newGroups] = await Promise.all([
      Group.find({
        members: { $elemMatch: { user: userId, role: "owner" } },
      }).limit(10),
      Group.find({
        members: {
          $elemMatch: {
            user: userId,
            role: { $ne: "owner" },
          },
        },
      }).limit(10),
      Group.find({ "members.user": { $ne: userId } }).limit(10),
    ]);
    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "groups_dashboard_fetched_successfully",
      data: {
        myGroups,
        followedGroups,
        newGroups,
      },
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_fetching_groups_dashboard",
      error,
    });
  }
};

const getMyGroups = async (req, res) => {
  const userId = req.user._id;
  return fetchPaginatedGroups(
    { "members.user": userId },
    req,
    res,
    "my_groups_fetched_successfully",
  );
};

const getFollowedGroups = async (req, res) => {
  const userId = req.user._id;
  return fetchPaginatedGroups(
    { members: { $elemMatch: { user: userId, role: "follower" } } },
    req,
    res,
    "followed_groups_fetched_successfully",
  );
};

const getNewGroups = async (req, res) => {
  const userId = req.user._id;
  return fetchPaginatedGroups(
    { "members.user": { $ne: userId } },
    req,
    res,
    "new_groups_fetched_successfully",
  );
};

const getGroups = async (req, res) => {
  const userId = req.user._id;
  const { type } = req.query;

  const validTypes = ["my", "followed", "new"];
  if (type && !validTypes.includes(type)) {
    return sendResponse({
      res,
      statusCode: 400,
      translationKey: "invalid_group_type",
    });
  }

  let query = {};
  let translationKey = "groups_fetched_successfully";

  if (type === "my") {
    query = { "members.user": userId };
    translationKey = "my_groups_fetched_successfully";
  } else if (type === "followed") {
    query = { members: { $elemMatch: { user: userId, role: "follower" } } };
    translationKey = "followed_groups_fetched_successfully";
  } else if (type === "new") {
    query = { "members.user": { $ne: userId } };
    translationKey = "new_groups_fetched_successfully";
  }

  return fetchPaginatedGroups(query, req, res, translationKey);
};

const getGroupById = async (req, res) => {
  const { groupId } = req.params;

  const validationOptions = {
    pathParams: ["groupId"],
    objectIdFields: ["groupId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const group = await Group.findById({ _id: groupId });

    // i want populate user details in members array
    await group.populate("members.user", "name email profileIcon belt");

    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }
    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "group_fetched_successfully",
      data: group,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_fetching_group",
      error,
    });
  }
};

const getMembersByGroupId = async (req, res) => {
  const { groupId } = req.params;
  const { page, limit, skip } = parsePaginationParams(req);
  const { status } = req.query; // "active", "pending", "all"

  const validationOptions = {
    pathParams: ["groupId"],
    objectIdFields: ["groupId"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const group = await Group.findById({ _id: groupId });
    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }

    await group.populate("members.user", "name email profileIcon belt");

    let filteredMembers = group.members;
    if (status === "active") {
      filteredMembers = filteredMembers.filter((m) => m.status === "active");
    } else if (status === "pending") {
      filteredMembers = filteredMembers.filter((m) => m.status === "pending");
    }
    // status === "all" or undefined returns all members

    const total = filteredMembers.length;
    const paginatedMembers = filteredMembers.slice(skip, skip + limit);

    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "group_members_fetched_successfully",
      data: paginatedMembers,
      meta: generateMeta(page, limit, total),
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_fetching_group_members",
      error: error.message || error,
    });
  }
};

const createGroup = async (req, res) => {
  const userId = req.user._id;
  const { name, description, groupImage, coverImage, visibility } = req.body;

  const validationOptions = {
    rawData: ["name", "visibility"],
  };

  if (!validateParams(req, res, validationOptions)) {
    return;
  }

  try {
    const newGroup = await Group.create({
      name,
      owner: userId,
      description,
      groupImage,
      coverImage,
      visibility: visibility || "public",
      members: [
        {
          user: userId,
          role: "owner",
          status: "active",
        },
      ],
    });

    await newGroup.save();
    return sendResponse({
      res,
      statusCode: 201,
      translationKey: "group_created_successfully",
      data: newGroup,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_creating_group",
      error,
    });
  }
};

const joinGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const validationOptions = {
      pathParams: ["groupId"],
      objectIdFields: ["groupId"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return;
    }

    const group = await Group.findById({ _id: groupId });
    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }
    if (!group.members.some((m) => m.user.equals(userId))) {
      group.members.push({
        user: userId,
        role: "member",
        status: "active",
      });
      await group.save();
      return sendResponse({
        res,
        statusCode: 200,
        translationKey: "joined_group_successfully",
        data: group,
      });
    } else {
      return sendResponse({
        res,
        statusCode: 400,
        translationKey: "already_a_member",
      });
    }
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_joining_group",
      error,
    });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const validationOptions = {
      pathParams: ["groupId"],
      objectIdFields: ["groupId"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return;
    }

    const group = await Group.findById({ _id: groupId });

    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }
    group.members = group.members.filter((m) => !m.user.equals(userId));
    await group.save();
    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "left_group_successfully",
      data: group,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_leaving_group",
      error,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const validationOptions = {
      pathParams: ["groupId"],
      objectIdFields: ["groupId"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return;
    }

    const group = await Group.findById({ _id: groupId });

    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }
    if (
      !group.members.some((m) => m.user.equals(userId) && m.role === "owner")
    ) {
      return sendResponse({
        res,
        statusCode: 403,
        translationKey: "only_owner_can_delete_group",
      });
    }
    if (group.isDeleted) {
      return sendResponse({
        res,
        statusCode: 400,
        translationKey: "group_already_deleted",
      });
    }

    group.isDeleted = true;
    await group.save();
    return sendResponse({
      res,
      statusCode: 200,
      translationKey: "group_deleted_successfully",
      data: group,
    });
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_deleting_group",
      error,
    });
  }
};

const toggleFollowGroup = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const validationOptions = {
      pathParams: ["groupId"],
      objectIdFields: ["groupId"],
    };

    if (!validateParams(req, res, validationOptions)) {
      return;
    }

    const group = await Group.findById({ _id: groupId });

    if (!group) {
      return sendResponse({
        res,
        statusCode: 404,
        translationKey: "group_not_found",
      });
    }

    const followerIndex = group.members.findIndex(
      (m) => m.user.equals(userId) && m.role === "follower",
    );

    if (followerIndex > -1) {
      group.members.splice(followerIndex, 1);
      await group.save();
      return sendResponse({
        res,
        statusCode: 200,
        translationKey: "unfollowed_group_successfully",
        data: group,
      });
    } else {
      group.members.push({
        user: userId,
        role: "follower",
        status: "active",
      });
      await group.save();
      return sendResponse({
        res,
        statusCode: 200,
        translationKey: "followed_group_successfully",
        data: group,
      });
    }
  } catch (error) {
    return sendResponse({
      res,
      statusCode: 500,
      translationKey: "an_error_occurred_while_toggling_follow_group",
      error,
    });
  }
};

module.exports = {
  getGroupsDashboard,
  getMyGroups,
  getFollowedGroups,
  getNewGroups,
  getGroups,
  getGroupById,
  getMembersByGroupId,
  createGroup,
  joinGroup,
  leaveGroup,
  deleteGroup,
  toggleFollowGroup,
};
