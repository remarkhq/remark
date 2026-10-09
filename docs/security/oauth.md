# OAuth security

Remark uses cryptographically random OAuth state values that are single-use and expiring.
Callback state is validated before exchanging authorization code.
