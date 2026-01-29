# Modular Structure

Each module (folder) should contain:
- `[name].interface.ts`: Type definitions
- `[name].model.ts`: Mongoose schema / Zod validation (if needed)
- `[name].controller.ts`: Request handling
- `[name].service.ts`: Business logic & Database calls
- `[name].route.ts`: Route definitions

## Modules Created:
- Auth
- User
- Restaurant
- Food
- Category
- Order
- Cart
- Blog
- Review
