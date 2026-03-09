package services;

import java.util.*;


class mailCheck {
    static private HashSet<String> aproaved = 
    {
        "yandex.ru",
        "gmail.com"
    };


    static public boolean Check( String mail){
        String domen;
        boolean f = 0;
        for(char i : mail.toCharArray()){
            if(i == "@"){
                f = 1;
            }
            if (f){
                domen+=i;
            }

        }

        if(aproaved.contains(domen)){
            return 1;
        }
        return 0;
    }
}
