package models;

public class TwoFactorResponse {
    private String message;
    private boolean twoFactorEnabled;

    public TwoFactorResponse(String message, boolean twoFactorEnabled) {
        this.message = message;
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }
}
