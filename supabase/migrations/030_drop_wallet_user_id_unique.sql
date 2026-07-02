-- Allow each organization to have its own wallet per user.
-- Previously user_id was UNIQUE, limiting one wallet per user.

alter table wallets drop constraint if exists wallets_user_id_key;
