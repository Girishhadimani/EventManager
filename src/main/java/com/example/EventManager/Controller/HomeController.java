package com.example.EventManager.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    /**
     * Serves the single login page for all roles.
     * After login, JavaScript reads the role from the JWT response
     * and redirects to the appropriate dashboard HTML.
     */
    @GetMapping("/")
    public String home() {
        return "forward:/index.html";
    }
}