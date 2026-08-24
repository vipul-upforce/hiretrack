# HireTrack — Client setup & server access

HireTrack is open source. There is no license admin and no license registration.

Point the installer at GitHub Releases:

```bash
export GITHUB_RELEASE_REPO=rahulp162/hiretrack
./installer.sh --install
```

## Server SSH access

Generate a **separate key per server**.

### Generate keys (on your laptop)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_hiretrack_prod
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_hiretrack_dev
```

You can use other suffixes; keep the name unique per server.

### Copy the public keys

Send the `.pub` files to whoever administers the VMs so they can add them to `authorized_keys`.
