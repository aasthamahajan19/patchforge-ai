import boto3

# VULNERABLE: Hardcoding private access keys and secrets in code is highly insecure
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

def list_s3_buckets():
    print("Initializing S3 Client...")
    # Client initialized with plaintext keys
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name='us-east-1'
    )
    
    response = s3.list_buckets()
    buckets = [bucket['Name'] for bucket in response['Buckets']]
    print(f"Found {len(buckets)} S3 buckets: {', '.join(buckets)}")
    return buckets

if __name__ == "__main__":
    list_s3_buckets()
