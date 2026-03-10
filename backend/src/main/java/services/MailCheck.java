package services;

import java.util.HashSet;
import java.util.Set;

public class MailCheck {
    private static final Set<String> approvedDomains = new HashSet<>();

    static {
        approvedDomains.add("yandex.ru");
        approvedDomains.add("gmail.com");
    }

    public static boolean isAllowed(String mail) {
        if (mail == null || mail.isEmpty()) {
            return false;
        }
        int atIndex = mail.lastIndexOf('@');
        if (atIndex == -1 || atIndex == mail.length() - 1) {
            return false;
        }
        String domain = mail.substring(atIndex + 1);
        return approvedDomains.contains(domain);
    }
}
