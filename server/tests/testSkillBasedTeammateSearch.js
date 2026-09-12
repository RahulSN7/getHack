const dns = require("dns");
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);
} catch (err) {
  // Ignore DNS warning
}

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user");
const { findTeammates } = require("../tools/findTeammates");
const { callLLM } = require("../services/aiService");

async function runTests() {
  console.log("=== STARTING SKILL-BASED TEAMMATE SEARCH TESTS ===");

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/gethack";
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB:", mongoUri);

  try {
    // 1. Ensure test candidates exist in DB
    let userRahul = await User.findOne({ email: "rahul.js@gethack.test" });
    if (!userRahul) {
      userRahul = await User.create({
        name: "Rahul",
        email: "rahul.js@gethack.test",
        role: "participant",
        isEmailVerified: true,
        profile: {
          headline: "Full Stack Developer",
          role: "Full Stack Developer",
          skills: ["JavaScript", "React", "Node.js"],
          availability: "Available",
          experienceLevel: "Intermediate",
          bio: "JavaScript expert",
        },
      });
    } else {
      userRahul.profile.skills = ["JavaScript", "React", "Node.js"];
      userRahul.profile.availability = "Available";
      await userRahul.save();
    }

    let userAman = await User.findOne({ email: "aman.js@gethack.test" });
    if (!userAman) {
      userAman = await User.create({
        name: "Aman",
        email: "aman.js@gethack.test",
        role: "participant",
        isEmailVerified: true,
        profile: {
          headline: "Frontend Engineer",
          role: "Frontend Engineer",
          skills: ["JavaScript", "Vue", "CSS"],
          availability: "Available",
          experienceLevel: "Intermediate",
          bio: "Frontend JS enthusiast",
        },
      });
    } else {
      userAman.profile.skills = ["JavaScript", "Vue", "CSS"];
      userAman.profile.availability = "Available";
      await userAman.save();
    }

    let mainUser = await User.findOne({ email: "mainuser@gethack.test" });
    if (!mainUser) {
      mainUser = await User.create({
        name: "Main User",
        email: "mainuser@gethack.test",
        role: "participant",
        isEmailVerified: true,
        profile: {
          headline: "Full Stack Developer",
          role: "Full Stack Developer",
          skills: ["React", "Node.js", "MongoDB"],
          availability: "Available",
        },
      });
    }

    const context = {
      userProfile: {
        id: mainUser._id.toString(),
        skills: ["React", "Node.js", "MongoDB"],
      },
      user: { _id: mainUser._id.toString() },
    };

    console.log("\n--- TEST 1: Suggest me teammates of JavaScript. ---");
    let res1Tool = await callLLM([{ role: "user", content: "Suggest me teammates of JavaScript." }], context);
    console.log("Tool Calls generated:", JSON.stringify(res1Tool.toolCalls));

    const toolResult1 = await findTeammates(res1Tool.toolCalls[0].args, context);
    console.log("find_teammates output count:", toolResult1.teammates.length);

    let res1Final = await callLLM([
      { role: "user", content: "Suggest me teammates of JavaScript." },
      { role: "assistant", tool_calls: res1Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult1) }
    ], context);

    console.log("Final Response Text:", res1Final.text);
    console.log("Recommendations count:", res1Final.recommendations?.teammates?.length);
    console.log("Candidate names:", res1Final.recommendations?.teammates?.map(t => t.name).join(", "));

    if (!res1Final.recommendations?.teammates?.some(t => t.name.includes("Rahul"))) {
      throw new Error("FAIL: Test 1 did not return JavaScript candidate Rahul");
    }

    console.log("\n--- TEST 2: Find JavaScript teammates. ---");
    let res2Tool = await callLLM([{ role: "user", content: "Find JavaScript teammates." }], context);
    let toolResult2 = await findTeammates(res2Tool.toolCalls[0].args, context);
    let res2Final = await callLLM([
      { role: "user", content: "Find JavaScript teammates." },
      { role: "assistant", tool_calls: res2Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult2) }
    ], context);

    console.log("Final Response Text:", res2Final.text);
    console.log("Candidate names:", res2Final.recommendations?.teammates?.map(t => t.name).join(", "));
    if (!res2Final.recommendations?.teammates?.some(t => t.name.includes("Rahul"))) {
      throw new Error("FAIL: Test 2 did not return JavaScript candidate Rahul");
    }

    console.log("\n--- TEST 3: Find teammates who know JS. ---");
    let res3Tool = await callLLM([{ role: "user", content: "Find teammates who know JS." }], context);
    let toolResult3 = await findTeammates(res3Tool.toolCalls[0].args, context);
    let res3Final = await callLLM([
      { role: "user", content: "Find teammates who know JS." },
      { role: "assistant", tool_calls: res3Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult3) }
    ], context);

    console.log("Final Response Text:", res3Final.text);
    console.log("Candidate names:", res3Final.recommendations?.teammates?.map(t => t.name).join(", "));
    if (!res3Final.recommendations?.teammates?.some(t => t.name.includes("Rahul"))) {
      throw new Error("FAIL: Test 3 did not return JavaScript candidate Rahul");
    }

    console.log("\n--- TEST 4: Find Python teammates. ---");
    let res4Tool = await callLLM([{ role: "user", content: "Find Python teammates." }], context);
    let toolResult4 = await findTeammates(res4Tool.toolCalls[0].args, context);
    let res4Final = await callLLM([
      { role: "user", content: "Find Python teammates." },
      { role: "assistant", tool_calls: res4Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult4) }
    ], context);

    console.log("Final Response Text:", res4Final.text);
    console.log("Candidate names:", res4Final.recommendations?.teammates?.map(t => t.name).join(", "));
    if (res4Final.recommendations?.teammates?.some(t => t.name === "Rahul" || t.name === "Aman")) {
      throw new Error("FAIL: Test 4 returned JavaScript users for a Python search!");
    }

    console.log("\n--- TEST 5: Find React teammates. ---");
    let res5Tool = await callLLM([{ role: "user", content: "Find React teammates." }], context);
    let toolResult5 = await findTeammates(res5Tool.toolCalls[0].args, context);
    let res5Final = await callLLM([
      { role: "user", content: "Find React teammates." },
      { role: "assistant", tool_calls: res5Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult5) }
    ], context);

    console.log("Final Response Text:", res5Final.text);
    console.log("Candidate names:", res5Final.recommendations?.teammates?.map(t => t.name).join(", "));

    console.log("\n--- TEST 8: Find Rust teammates (Case 2 - No matching skill candidates exist). ---");
    let res8Tool = await callLLM([{ role: "user", content: "Find Rust teammates." }], context);
    let toolResult8 = await findTeammates(res8Tool.toolCalls[0].args, context);
    let res8Final = await callLLM([
      { role: "user", content: "Find Rust teammates." },
      { role: "assistant", tool_calls: res8Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResult8) }
    ], context);

    console.log("Final Response Text:", res8Final.text);
    console.log("Candidate count:", res8Final.recommendations?.teammates?.length);
    if (res8Final.recommendations?.teammates?.length !== 0) {
      throw new Error("FAIL: Test 8 returned candidate cards for a Rust search when no Rust candidates exist!");
    }
    if (!res8Final.text.includes("couldn't find any available teammates with Rust skills")) {
      throw new Error("FAIL: Test 8 text does not contain required empty state message");
    }

    console.log("\n--- TEST CASE 3: Skill exists in DB but users are NOT AVAILABLE ---");
    await User.updateMany({ $or: [{ "profile.skills": { $regex: /javascript|js/i } }, { skills: { $regex: /javascript|js/i } }] }, { $set: { "profile.availability": "Not Available", availability: "Not Available" } });

    let resCase3Tool = await callLLM([{ role: "user", content: "Suggest me teammates of JavaScript." }], context);
    let toolResultCase3 = await findTeammates(resCase3Tool.toolCalls[0].args, context);
    let resCase3Final = await callLLM([
      { role: "user", content: "Suggest me teammates of JavaScript." },
      { role: "assistant", tool_calls: resCase3Tool.toolCalls },
      { role: "tool", name: "find_teammates", content: JSON.stringify(toolResultCase3) }
    ], context);

    console.log("Case 3 Response Text:", resCase3Final.text);
    console.log("Case 3 Candidate count:", resCase3Final.recommendations?.teammates?.length);

    // Cleanup / restore test data availability
    await User.updateMany({ $or: [{ "profile.skills": { $regex: /javascript|js/i } }, { skills: { $regex: /javascript|js/i } }] }, { $set: { "profile.availability": "Available", availability: "Available" } });

    if (resCase3Final.recommendations?.teammates?.length !== 0) {
      throw new Error("FAIL: Case 3 returned candidate cards when matching users were Not Available!");
    }
    if (!resCase3Final.text.includes("found users with JavaScript skills, but no JavaScript teammates are available") && !resCase3Final.text.includes("no JavaScript teammates are available") && !resCase3Final.text.includes("couldn't find any available teammates")) {
      throw new Error("FAIL: Case 3 text does not contain required unavailable users message");
    }

    console.log("\n✅ ALL SKILL-BASED TEAMMATE SEARCH TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
