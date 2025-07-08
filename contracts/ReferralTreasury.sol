// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ReferralTreasury is ReentrancyGuard {
    /// @notice Dirección del contrato que dispara los créditos (tu Gift contract)
    address public immutable giftContract;

    /// @notice Saldo acumulado para cada referido
    mapping(address => uint256) public balance;

    /// @notice Evento emitido cuando se acredita una comisión
    event Credit(address indexed referrer, uint256 amount);


    /// @param _giftContract Dirección del contrato principal de mint/regalo
    constructor(address _giftContract) {
        require(_giftContract != address(0), "Invalid gift contract");
        giftContract = _giftContract;
    }

    /// @notice Solo el contrato de regalo puede acreditar comisiones
    /// @param referrer Dirección del usuario referido
    function credit(address referrer) external payable {
        require(msg.sender == giftContract, "Only gift contract");
        require(referrer != address(0), "Invalid referrer");
        require(msg.value > 0, "No fee");
        balance[referrer] += msg.value;
        emit Credit(referrer, msg.value);
    }

    /// @notice Permite a un referido retirar su saldo libre de reentradas
    function withdraw() external nonReentrant {
        uint256 amt = balance[msg.sender];
        require(amt > 0, "No rewards");
        balance[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amt}("");
        require(success, "Transfer failed");
    }
}
