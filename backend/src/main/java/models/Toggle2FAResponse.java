package models;

public class Toggle2FAResponse {
    private boolean isTwoFactorEnabled;
    private String message;

    public Toggle2FAResponse(boolean isTwoFactorEnabled, String message) {
        this.isTwoFactorEnabled = isTwoFactorEnabled;
        this.message = message;
    }

    public boolean isTwoFactorEnabled() {
        return isTwoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        isTwoFactorEnabled = twoFactorEnabled;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
