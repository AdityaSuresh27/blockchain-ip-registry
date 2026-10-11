// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPRegistry
 * @dev Decentralized Intellectual Property Provenance and Licensing System
 * Records cryptographic fingerprints, ownership provenance, version chains,
 * and licensing agreements immutably on-chain.
 */
contract IPRegistry {
    
    struct IPRecord {
        bytes32 fileHash;
        address creator;
        address owner;
        uint256 timestamp;
        uint256 version;
        string licenseTerms;
        string ipfsURI;
        bytes32 previousVersionHash;
        bool exists;
    }

    // Mapping from file hash to IPRecord
    mapping(bytes32 => IPRecord) public registry;
    
    // Mapping from creator to their registered hashes
    mapping(address => bytes32[]) private creatorRecords;

    // Array of all registered hashes for public auditability and discovery
    bytes32[] public allRegisteredHashes;

    // Linked version chains: hash => child revision hashes
    mapping(bytes32 => bytes32[]) private subsequentVersions;

    // Events matching lifecycle requirements
    event IPRegistered(
        bytes32 indexed fileHash,
        address indexed creator,
        uint256 timestamp,
        uint256 version,
        bytes32 indexed previousVersionHash
    );
    event OwnershipTransferred(
        bytes32 indexed fileHash,
        address indexed oldOwner,
        address indexed newOwner,
        uint256 timestamp
    );
    event LicenseUpdated(
        bytes32 indexed fileHash,
        string newLicenseTerms,
        uint256 timestamp
    );

    /**
     * @notice Register a brand-new original intellectual property
     * @param _fileHash SHA-256 / Keccak-256 cryptographic digest of the file
     * @param _licenseTerms Machine-readable or standard legal license text (e.g. MIT, CC-BY-4.0)
     * @param _ipfsURI Content Identifier (CID) for off-chain file storage on IPFS
     */
    function registerIP(
        bytes32 _fileHash, 
        string memory _licenseTerms, 
        string memory _ipfsURI,
        uint256 _version
    ) public {
        require(!registry[_fileHash].exists, "IP already registered with this hash");
        require(_fileHash != bytes32(0), "Invalid file hash");

        uint256 versionNumber = _version == 0 ? 1 : _version;

        registry[_fileHash] = IPRecord({
            fileHash: _fileHash,
            creator: msg.sender,
            owner: msg.sender,
            timestamp: block.timestamp,
            version: versionNumber,
            licenseTerms: _licenseTerms,
            ipfsURI: _ipfsURI,
            previousVersionHash: bytes32(0),
            exists: true
        });

        creatorRecords[msg.sender].push(_fileHash);
        allRegisteredHashes.push(_fileHash);

        emit IPRegistered(_fileHash, msg.sender, block.timestamp, versionNumber, bytes32(0));
    }

    /**
     * @notice Register a revision / new version linked to an existing registered IP
     * @param _prevFileHash The hash of the predecessor version
     * @param _newFileHash The cryptographic hash of the new revision
     * @param _licenseTerms Updated or maintained licensing terms
     * @param _ipfsURI Off-chain IPFS storage URI for the new revision
     */
    function registerNewVersion(
        bytes32 _prevFileHash,
        bytes32 _newFileHash,
        string memory _licenseTerms,
        string memory _ipfsURI
    ) public {
        require(registry[_prevFileHash].exists, "Predecessor IP not found");
        require(registry[_prevFileHash].owner == msg.sender, "Only current IP owner can publish new versions");
        require(!registry[_newFileHash].exists, "New version hash is already registered");
        require(_newFileHash != bytes32(0), "Invalid new file hash");

        uint256 newVersionNumber = registry[_prevFileHash].version + 1;

        registry[_newFileHash] = IPRecord({
            fileHash: _newFileHash,
            creator: registry[_prevFileHash].creator, // preserve original creator provenance
            owner: msg.sender,
            timestamp: block.timestamp,
            version: newVersionNumber,
            licenseTerms: _licenseTerms,
            ipfsURI: _ipfsURI,
            previousVersionHash: _prevFileHash,
            exists: true
        });

        subsequentVersions[_prevFileHash].push(_newFileHash);
        creatorRecords[msg.sender].push(_newFileHash);
        allRegisteredHashes.push(_newFileHash);

        emit IPRegistered(_newFileHash, registry[_prevFileHash].creator, block.timestamp, newVersionNumber, _prevFileHash);
    }

    /**
     * @notice Transfer intellectual property ownership rights to a new wallet
     */
    function transferOwnership(bytes32 _fileHash, address _newOwner) public {
        require(registry[_fileHash].exists, "IP not registered");
        require(registry[_fileHash].owner == msg.sender, "Only current owner can transfer ownership");
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer ownership to yourself");

        address oldOwner = registry[_fileHash].owner;
        registry[_fileHash].owner = _newOwner;

        emit OwnershipTransferred(_fileHash, oldOwner, _newOwner, block.timestamp);
    }

    /**
     * @notice Update digital license terms associated with the IP
     */
    function updateLicenseTerms(bytes32 _fileHash, string memory _newLicenseTerms) public {
        require(registry[_fileHash].exists, "IP not registered");
        require(registry[_fileHash].owner == msg.sender, "Only owner can update license terms");

        registry[_fileHash].licenseTerms = _newLicenseTerms;

        emit LicenseUpdated(_fileHash, _newLicenseTerms, block.timestamp);
    }

    /**
     * @notice Public verification method to inspect provenance and validity without login
     */
    function verifyIP(bytes32 _fileHash) public view returns (
        address creator,
        address owner,
        uint256 timestamp,
        uint256 version,
        string memory licenseTerms,
        string memory ipfsURI,
        bytes32 previousVersionHash,
        bool exists
    ) {
        IPRecord memory record = registry[_fileHash];
        return (
            record.creator,
            record.owner,
            record.timestamp,
            record.version,
            record.licenseTerms,
            record.ipfsURI,
            record.previousVersionHash,
            record.exists
        );
    }

    /**
     * @notice Get all subsequent version hashes registered for a specific IP hash
     */
    function getSubsequentVersions(bytes32 _fileHash) external view returns (bytes32[] memory) {
        return subsequentVersions[_fileHash];
    }

    /**
     * @notice Get all IP hashes registered or owned by a specific address
     */
    function getCreatorRecords(address _creator) external view returns (bytes32[] memory) {
        return creatorRecords[_creator];
    }

    /**
     * @notice Get total number of registered IPs on the network
     */
    function getTotalRecordCount() external view returns (uint256) {
        return allRegisteredHashes.length;
    }

    /**
     * @notice Quick duplicate detection check
     */
    function isHashRegistered(bytes32 _fileHash) external view returns (bool) {
        return registry[_fileHash].exists;
    }

    /**
     * @notice Get a list of recent registered hashes for discovery
     */
    function getAllHashes() external view returns (bytes32[] memory) {
        return allRegisteredHashes;
    }
}
