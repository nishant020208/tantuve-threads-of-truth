pragma solidity ^0.8.24;

contract TantuveRegistry {
    struct ProductRecord {
        bytes32 ledgerHash;
        uint256 timestamp;
        address writer;
        bool exists;
    }

    mapping(string => ProductRecord) public records;

    event ProductRegistered(
        string indexed productId,
        bytes32 ledgerHash,
        uint256 timestamp,
        address writer
    );

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

    function getProduct(string calldata productId)
        external
        view
        returns (bytes32 ledgerHash, uint256 timestamp, address writer, bool exists)
    {
        ProductRecord storage r = records[productId];
        return (r.ledgerHash, r.timestamp, r.writer, r.exists);
    }
}

