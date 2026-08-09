

WIF_PROVIDER=projects/1059825192038/locations/global/workloadIdentityPools/github-pool/providers/github-provider
WIF_SERVICE_ACCOUNT=github-deployer@pave-504011.iam.gserviceaccount.com


gcloud run services add-iam-policy-binding kuza-user-portal \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=europe-west1 \
    --project=pave-504011