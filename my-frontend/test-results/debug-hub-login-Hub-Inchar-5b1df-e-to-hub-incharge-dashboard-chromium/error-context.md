# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e8]:
      - heading "Sign in" [level=1] [ref=e9]
      - paragraph [ref=e10]: Use your account
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Email or phone
          - textbox "Email or phone" [ref=e16]
        - generic [ref=e17]:
          - generic [ref=e18]: Password
          - generic [ref=e19]:
            - textbox "Password" [ref=e20]
            - button [ref=e21] [cursor=pointer]:
              - img [ref=e22]
        - generic [ref=e25]:
          - button "Forgot email?" [ref=e27] [cursor=pointer]
          - button "Next" [disabled] [ref=e29]:
            - generic [ref=e30]: Next
      - generic [ref=e32]:
        - heading "Demo accounts" [level=3] [ref=e33]
        - button "Show" [ref=e34] [cursor=pointer]
      - generic [ref=e35]: Not your computer? Use Private Browsing windows to sign in. Learn more about using Guest mode
```