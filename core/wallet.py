from eth_account import Account
from eth_account.messages import encode_defunct

def sign_payment_iou(private_key, recipient_address, amount, nonce):
    """Generates a cryptographic signature (digital check)."""
    # Standard packet format for Dev 1's backend
    payment_data = f"PAY:{recipient_address}:AMT:{amount}:NONCE:{nonce}"
    message = encode_defunct(text=payment_data)
    signed_message = Account.sign_message(message, private_key=private_key)
    return signed_message.signature.hex()

def verify_iou(signature, signer_address, recipient_address, amount, nonce):
    """Workers use this to make sure the check is real."""
    payment_data = f"PAY:{recipient_address}:AMT:{amount}:NONCE:{nonce}"
    message = encode_defunct(text=payment_data)
    recovered_address = Account.recover_message(message, signature=signature)
    return recovered_address.lower() == signer_address.lower()
