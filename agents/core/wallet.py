"""
Wallet utilities for AI agent payment integration.
Provides IOU signing and payment message creation for Yellow Network state channels.
"""

from eth_account import Account
from eth_account.messages import encode_defunct
import hashlib
import json
from typing import Dict, Any


def sign_payment_iou(private_key: str, recipient: str, amount: int, nonce: int) -> Dict[str, Any]:
    """
    Sign an IOU payment message for state channel transfer.
    
    Args:
        private_key: Agent's private key (hex string with or without 0x prefix)
        recipient: Recipient wallet address
        amount: Payment amount in wei
        nonce: Transaction nonce for replay protection
        
    Returns:
        Dictionary with payment IOU including signature
    """
    # Ensure private key has 0x prefix
    if not private_key.startswith('0x'):
        private_key = '0x' + private_key
    
    # Create payment message
    message = f"{recipient}:{amount}:{nonce}"
    message_hash = encode_defunct(text=message)
    
    # Sign the message
    signed = Account.sign_message(message_hash, private_key=private_key)
    
    return {
        "recipient": recipient,
        "amount": amount,
        "nonce": nonce,
        "signature": signed.signature.hex(),
        "message": message
    }


def create_payment_request(
    from_wallet: str,
    to_wallet: str,
    amount: int,
    service_type: str,
    channel_id: str = None
) -> Dict[str, Any]:
    """
    Create a payment request for the backend API.
    
    Args:
        from_wallet: Sender wallet address
        to_wallet: Recipient wallet address
        amount: Payment amount in wei
        service_type: Type of service being paid for
        channel_id: Optional channel ID for state channel payment
        
    Returns:
        Payment request dictionary
    """
    return {
        "from": from_wallet,
        "to": to_wallet,
        "amount": str(amount),
        "service_type": service_type,
        "channel_id": channel_id
    }


def verify_payment_signature(
    recipient: str,
    amount: int,
    nonce: int,
    signature: str,
    expected_signer: str
) -> bool:
    """
    Verify a payment IOU signature.
    
    Args:
        recipient: Expected recipient address
        amount: Payment amount
        nonce: Transaction nonce
        signature: Signature to verify (hex string)
        expected_signer: Expected signer address
        
    Returns:
        True if signature is valid and from expected signer
    """
    message = f"{recipient}:{amount}:{nonce}"
    message_hash = encode_defunct(text=message)
    
    try:
        recovered = Account.recover_message(message_hash, signature=bytes.fromhex(signature.replace('0x', '')))
        return recovered.lower() == expected_signer.lower()
    except Exception:
        return False


def generate_channel_nonce() -> str:
    """Generate a unique nonce for channel creation."""
    import time
    import random
    data = f"{time.time()}-{random.randint(0, 1000000)}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]
