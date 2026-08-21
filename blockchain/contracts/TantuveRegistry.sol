// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Tantuve — GI Handloom Traceability
 * @notice Stores an immutable hash of each product's production ledger
 *         on Polygon Amoy testnet. Written once per product, never editable.
 */
contract TantuveRegistry {
    struct ProductRecord {
        bytes32 ledgerHash;      // Final SHA-256 of the product's ledger chain
        uint256 timestamp;       // Block timestamp when written
        address writer;          // Wallet that submitted the record
        bool exists;             // Guard against double-writes
    }

    // product ID (e.g. "TNT-PTL-00231") → on-chain record
    mapping(string => ProductRecord) public records;

    event ProductRegistered(
        string indexed productId,
        bytes32 ledgerHash,
        uint256 timestamp,
        address writer
    );

    /**
     * @notice Write a product's ledger hash on-chain. Can only be called once per product.
     * @param productId  Short human-readable product code
     * @param ledgerHash The final SHA-256 hash of the product's production ledger
     */
    function registerProduct(
        string calldata productId,
        bytes32 ledgerHash
    ) external {
        require(bytes(productId).length > 0, "Product ID required");
        require(!records[productId].exists, "Already registered");

        records[productId] = ProductRecord({
            ledgerHash: ledgerHash,
            timestamp: block.timestamp,
            writer: msg.sender,
            exists: true
        });

        emit ProductRegistered(productId, ledgerHash, block.timestamp, msg.sender);
    }

    /**
     * @notice Read a product's on-chain record. Returns exists=false if not found.
     */
    function getProduct(string calldata productId)
        external
        view
        returns (bytes32 ledgerHash, uint256 timestamp, address writer, bool exists)
    {
        ProductRecord storage r = records[productId];
        return (r.ledgerHash, r.timestamp, r.writer, r.exists);
    }
}
