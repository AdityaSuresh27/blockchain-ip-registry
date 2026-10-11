const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IPRegistry Smart Contract — Comprehensive Test Suite", function () {
  let ipRegistry;
  let owner;
  let creator;
  let buyer;
  let stranger;

  // Sample mock hashes (32 bytes)
  const fileHash1 = ethers.keccak256(ethers.toUtf8Bytes("Paper_Original_Content_v1"));
  const fileHash2 = ethers.keccak256(ethers.toUtf8Bytes("Paper_Revised_Content_v2"));
  const fileHash3 = ethers.keccak256(ethers.toUtf8Bytes("Separate_Artwork_Audio"));
  const mockIpfsURI1 = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
  const mockIpfsURI2 = "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx";
  const licenseMIT = "MIT License - Permissive open source use.";
  const licenseCommercial = "Proprietary Commercial License - All Rights Reserved.";

  beforeEach(async function () {
    [owner, creator, buyer, stranger] = await ethers.getSigners();

    const IPRegistryFactory = await ethers.getContractFactory("IPRegistry");
    ipRegistry = await IPRegistryFactory.deploy();
    await ipRegistry.waitForDeployment();
  });

  describe("Feature 1: Initial Deployment & Discovery", function () {
    it("should deploy with zero registered records", async function () {
      expect(await ipRegistry.getTotalRecordCount()).to.equal(0);
      const allHashes = await ipRegistry.getAllHashes();
      expect(allHashes.length).to.equal(0);
    });
  });

  describe("Feature 2: IP Registration & Timestamped Proof", function () {
    it("should successfully register a new digital asset with on-chain metadata", async function () {
      const tx = await ipRegistry.connect(creator).registerIP(
        fileHash1,
        licenseMIT,
        mockIpfsURI1,
        1
      );
      await tx.wait();

      const record = await ipRegistry.verifyIP(fileHash1);

      expect(record.exists).to.be.true;
      expect(record.creator).to.equal(creator.address);
      expect(record.owner).to.equal(creator.address);
      expect(record.version).to.equal(1);
      expect(record.licenseTerms).to.equal(licenseMIT);
      expect(record.ipfsURI).to.equal(mockIpfsURI1);
      expect(record.previousVersionHash).to.equal(ethers.ZeroHash);
      expect(record.timestamp).to.be.greaterThan(0);

      // Verify total record counts
      expect(await ipRegistry.getTotalRecordCount()).to.equal(1);
      const creatorRecords = await ipRegistry.getCreatorRecords(creator.address);
      expect(creatorRecords).to.deep.equal([fileHash1]);
    });

    it("should reject registration with empty/zero hash", async function () {
      await expect(
        ipRegistry.connect(creator).registerIP(ethers.ZeroHash, licenseMIT, mockIpfsURI1, 1)
      ).to.be.revertedWith("Invalid file hash");
    });
  });

  describe("Feature 3: Duplicate Detection & Collision Prevention", function () {
    it("should reject duplicate registration of an already claimed file hash", async function () {
      // First registration by creator
      await ipRegistry.connect(creator).registerIP(fileHash1, licenseMIT, mockIpfsURI1, 1);

      // Second attempt by stranger with identical hash must revert
      await expect(
        ipRegistry.connect(stranger).registerIP(fileHash1, "Different License", "ipfs://other", 1)
      ).to.be.revertedWith("IP already registered with this hash");
    });

    it("should correctly report whether a hash is registered via isHashRegistered", async function () {
      expect(await ipRegistry.isHashRegistered(fileHash1)).to.be.false;
      await ipRegistry.connect(creator).registerIP(fileHash1, licenseMIT, mockIpfsURI1, 1);
      expect(await ipRegistry.isHashRegistered(fileHash1)).to.be.true;
    });
  });

  describe("Feature 4: Authenticity Check & Verification", function () {
    it("should return exists=false for unrecorded hashes", async function () {
      const record = await ipRegistry.verifyIP(fileHash3);
      expect(record.exists).to.be.false;
      expect(record.creator).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Feature 5: Version History Lineage Chaining", function () {
    beforeEach(async function () {
      await ipRegistry.connect(creator).registerIP(fileHash1, licenseMIT, mockIpfsURI1, 1);
    });

    it("should register a child version linked to the parent hash", async function () {
      const tx = await ipRegistry.connect(creator).registerNewVersion(
        fileHash1,
        fileHash2,
        licenseCommercial,
        mockIpfsURI2
      );
      await tx.wait();

      const v2Record = await ipRegistry.verifyIP(fileHash2);
      expect(v2Record.exists).to.be.true;
      expect(v2Record.version).to.equal(2);
      expect(v2Record.creator).to.equal(creator.address); // Provenance preserved!
      expect(v2Record.owner).to.equal(creator.address);
      expect(v2Record.previousVersionHash).to.equal(fileHash1);
      expect(v2Record.licenseTerms).to.equal(licenseCommercial);

      // Parent should record child in subsequent versions
      const children = await ipRegistry.getSubsequentVersions(fileHash1);
      expect(children).to.deep.equal([fileHash2]);
    });

    it("should prevent non-owners from registering a new version of someone else's IP", async function () {
      await expect(
        ipRegistry.connect(stranger).registerNewVersion(
          fileHash1,
          fileHash2,
          licenseCommercial,
          mockIpfsURI2
        )
      ).to.be.revertedWith("Only current IP owner can publish new versions");
    });
  });

  describe("Feature 6: Ownership Transfer", function () {
    beforeEach(async function () {
      await ipRegistry.connect(creator).registerIP(fileHash1, licenseMIT, mockIpfsURI1, 1);
    });

    it("should transfer title to a new owner while preserving original creator provenance", async function () {
      const tx = await ipRegistry.connect(creator).transferOwnership(fileHash1, buyer.address);
      await tx.wait();

      const record = await ipRegistry.verifyIP(fileHash1);
      expect(record.owner).to.equal(buyer.address);
      expect(record.creator).to.equal(creator.address); // Creator never changes!
    });

    it("should prevent non-owners from transferring ownership", async function () {
      await expect(
        ipRegistry.connect(stranger).transferOwnership(fileHash1, stranger.address)
      ).to.be.revertedWith("Only current owner can transfer ownership");
    });

    it("should reject transfer to zero address or self", async function () {
      await expect(
        ipRegistry.connect(creator).transferOwnership(fileHash1, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner address");

      await expect(
        ipRegistry.connect(creator).transferOwnership(fileHash1, creator.address)
      ).to.be.revertedWith("Cannot transfer ownership to yourself");
    });
  });

  describe("Feature 7: Digital Licensing Terms Update", function () {
    beforeEach(async function () {
      await ipRegistry.connect(creator).registerIP(fileHash1, licenseMIT, mockIpfsURI1, 1);
    });

    it("should allow the current owner to update licensing terms on-chain", async function () {
      const updatedTerms = "Updated Terms: Dual Licensed under MIT and Commercial Enterprise.";
      await ipRegistry.connect(creator).updateLicenseTerms(fileHash1, updatedTerms);

      const record = await ipRegistry.verifyIP(fileHash1);
      expect(record.licenseTerms).to.equal(updatedTerms);
    });

    it("should reject license update from unauthorized wallets", async function () {
      await expect(
        ipRegistry.connect(stranger).updateLicenseTerms(fileHash1, "Hacked License")
      ).to.be.revertedWith("Only owner can update license terms");
    });
  });
});
