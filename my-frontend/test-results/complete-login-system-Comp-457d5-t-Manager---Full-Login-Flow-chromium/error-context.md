# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e7]:
      - heading "Sign in" [level=1] [ref=e8]
      - paragraph [ref=e9]: Use your account
    - generic [ref=e11]:
      - generic [ref=e12]: Login failed. Please check your credentials.
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Email or phone
          - textbox "Email or phone" [ref=e16]: manager@business.com
          - paragraph [ref=e17]: Enter an email or phone number
        - generic [ref=e18]:
          - generic [ref=e19]: Password
          - generic [ref=e20]:
            - textbox "Password" [ref=e21]: password
            - button [ref=e22] [cursor=pointer]:
              - img [ref=e23]
        - generic [ref=e26]:
          - button "Forgot email?" [ref=e28] [cursor=pointer]
          - button "Next" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Next
      - generic [ref=e33]:
        - heading "Demo accounts" [level=3] [ref=e34]
        - button "Show" [ref=e35] [cursor=pointer]
      - generic [ref=e36]: Not your computer? Use Private Browsing windows to sign in. Learn more about using Guest mode
  - alert [ref=e37]
```