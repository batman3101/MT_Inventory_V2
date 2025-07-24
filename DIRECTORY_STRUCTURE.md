# MT_Inventory_V2 Project Directory Structure

This document provides a comprehensive overview of the MT_Inventory_V2 project directory structure, including all files and folders organized in a tree format.

## Root Directory
```
MT_Inventory_V2/
├── README.md                           # Project documentation
├── RLS_Integration_Guide.md           # Row Level Security integration guide
├── requirements.txt                   # Python dependencies
├── package.json                       # Node.js dependencies (root)
├── package-lock.json                  # Node.js dependency lock file (root)
├── main.py                            # Main application entry point
├── mt_inventory_v2.db                 # SQLite database file
├── database_schema.sql                # Database schema definition
├── database_schema_fixed.sql          # Fixed database schema
├── alembic.ini                        # Alembic migration configuration
└── node_modules/                      # Node.js dependencies (root level)
```

## Configuration & Setup Files
```
├── add_system_admin_role.py           # System admin role setup script
├── check_current_user.py              # User verification utility
├── check_supabase.py                  # Supabase connection test
├── check_tables.py                    # Database table verification
├── fix_user_auth.py                   # User authentication fix script
├── hash_pwd.py                        # Password hashing utility
├── run_db_update.py                   # Database update runner
├── test_permission_system.py          # Permission system testing
├── test_rpc.py                        # RPC functionality testing
└── update_user_role.py                # User role update utility
```

## API Directory Structure
```
api/
├── __init__.py                        # API package initialization
├── main.py                            # FastAPI main application
├── database.py                        # Database connection and configuration
├── middleware/
│   ├── __init__.py
│   └── auth.py                        # Authentication middleware
├── models/                            # SQLAlchemy database models
│   ├── __init__.py
│   ├── category.py                    # Category model
│   ├── department.py                  # Department model
│   ├── inbound.py                     # Inbound transaction model
│   ├── inventory.py                   # Inventory model
│   ├── outbound.py                    # Outbound transaction model
│   ├── part.py                        # Part model
│   ├── part_price.py                  # Part price model
│   ├── permission.py                  # Permission model
│   ├── supplier.py                    # Supplier model
│   └── user.py                        # User model
├── routers/                           # API route handlers
│   ├── __init__.py
│   ├── auth.py                        # Authentication routes
│   ├── categories.py                  # Category management routes
│   ├── departments.py                 # Department management routes
│   ├── inbound.py                     # Inbound transaction routes
│   ├── inventory.py                   # Inventory management routes
│   ├── outbound.py                    # Outbound transaction routes
│   ├── part_price.py                  # Part price management routes
│   ├── parts.py                       # Part management routes
│   ├── permissions.py                 # Permission management routes
│   ├── suppliers.py                   # Supplier management routes
│   └── users.py                       # User management routes
└── schemas/                           # Pydantic data schemas
    ├── __init__.py
    ├── category.py                    # Category schemas
    ├── department.py                  # Department schemas
    ├── inbound.py                     # Inbound transaction schemas
    ├── inventory.py                   # Inventory schemas
    ├── outbound.py                    # Outbound transaction schemas
    ├── part.py                        # Part schemas
    ├── part_price.py                  # Part price schemas
    ├── permission.py                  # Permission schemas
    ├── supplier.py                    # Supplier schemas
    └── user.py                        # User schemas
```

## Frontend Directory Structure
```
frontend/
├── README.md                          # Frontend documentation
├── package.json                       # Frontend dependencies
├── package-lock.json                  # Frontend dependency lock file
├── tsconfig.json                      # TypeScript configuration
├── tsconfig.node.json                 # TypeScript Node.js configuration
├── vite.config.ts                     # Vite build configuration
├── node_modules/                      # Frontend Node.js dependencies
└── src/                               # Source code
    ├── main.tsx                       # Application entry point
    ├── App.tsx                        # Main App component
    ├── index.css                      # Global styles
    ├── components/                    # Reusable components
    │   ├── Layout.tsx                 # Layout component
    │   └── templates/                 # Component templates
    ├── pages/                         # Page components
    │   ├── DashboardPage.tsx          # Dashboard page
    │   ├── InboundPage.tsx            # Inbound management page
    │   ├── InventoryPage.tsx          # Inventory management page
    │   ├── OutboundPage.tsx           # Outbound management page
    │   ├── PartsPage.tsx              # Parts management page
    │   ├── PermissionsPage.tsx        # Permissions management page
    │   ├── ReportsPage.tsx            # Reports page
    │   ├── SupabaseSettingsPage.tsx   # Supabase settings page
    │   ├── SuppliersPage.tsx          # Suppliers management page
    │   └── UserManagementPage.tsx     # User management page
    ├── services/                      # API service layer
    │   └── api.ts                     # API service functions
    └── utils/                         # Utility functions
        ├── excelUtils.ts              # Excel handling utilities
        └── supabase.ts                # Supabase client utilities
```

## Database Management
```
database/
├── supabase_client.py                 # Supabase client configuration
├── add_parts_updated_by.py            # Parts update tracking script
├── apply_rls_policies.py              # Row Level Security policy application
├── apply_user_permissions.py          # User permission application
├── update_part.py                     # Part update utility
├── create_inbound_view.sql            # Inbound view creation SQL
├── db_migration.sql                   # Database migration script
├── db_setup.sql                       # Database setup script
├── db_stored_procedures.sql           # Stored procedures
├── db_update.sql                      # Database update script
├── rls_policies_improved.sql          # Improved RLS policies
└── user_permissions_setup.sql        # User permissions setup
```

## Migration & Version Control
```
alembic/
├── env.py                             # Alembic environment configuration
├── script.py.mako                     # Migration script template
└── versions/                          # Database migration versions
```

## Data Templates & Import
```
excel_templates/
├── README.md                          # Template documentation
├── import_script.py                   # Data import script
├── PART_PRICES_TEMPLATE.xlsx          # Part prices Excel template
├── PART_TEMPLATE.xlsx                 # Parts Excel template
├── SUPPLIERS_TEMPLATE.xlsx            # Suppliers Excel template
├── inbound_template.csv               # Inbound transactions CSV template
├── inventory_template.csv             # Inventory CSV template
├── korean_names_template.csv          # Korean names CSV template
├── outbound_template.csv              # Outbound transactions CSV template
├── part_prices_template.csv           # Part prices CSV template
├── part_template_2.csv                # Alternative part template
├── parts_rows.csv                     # Parts data rows
├── parts_template.csv                 # Parts CSV template
├── parts_template_1.csv               # Parts template variant 1
├── suppliers_template.csv             # Suppliers CSV template
├── suppliers_template_1.csv           # Suppliers template variant 1
├── users_template.csv                 # Users CSV template
└── Supabase Snippet 부품 재고 정보 CSV 템플릿.csv  # Korean inventory template
```

## Legacy Components (Streamlit)
```
components/                            # Legacy Streamlit components
├── charts/                            # Chart components
├── data_tables/                       # Data table components
├── forms/                             # Form components
└── sidebar/                           # Sidebar components

pages/                                 # Legacy Streamlit pages (empty)

config/                                # Legacy configuration (empty)

utils/                                 # Legacy utilities (empty)
```

## Assets & Static Files
```
assets/
├── css/                               # CSS stylesheets (empty)
└── images/                            # Image assets
    ├── worker.png                     # Worker image
    └── worker1.png                    # Worker image variant

app/
└── static/                            # Static files
    └── worker1.png                    # Worker image
```

## Data Storage
```
data/
├── backup/                            # Data backup location
└── migration/                         # Migration data
```

## Scripts & Utilities
```
scripts/
└── create-inbound-view.js             # Inbound view creation script
```

## Deployment Configuration
```
.vercel/                               # Vercel deployment configuration
```

## File Type Summary

### Backend Files
- **Python (.py)**: FastAPI application, database models, utilities, and scripts
- **SQL (.sql)**: Database schema, migrations, and stored procedures
- **SQLite (.db)**: Local database file

### Frontend Files
- **TypeScript (.tsx, .ts)**: React components and utilities
- **CSS (.css)**: Styling
- **JSON (.json)**: Configuration and dependencies

### Configuration Files
- **INI (.ini)**: Alembic configuration
- **Markdown (.md)**: Documentation
- **YAML (.yaml)**: Configuration files (referenced in git status)

### Data Files
- **Excel (.xlsx)**: Data import templates
- **CSV (.csv)**: Data templates and samples

## Project Architecture

This is a full-stack inventory management system built with:

- **Backend**: FastAPI with SQLAlchemy ORM
- **Frontend**: React with TypeScript and Vite
- **Database**: SQLite (local) with Supabase integration
- **Authentication**: Row Level Security (RLS) implementation
- **Migration**: Alembic for database versioning
- **Deployment**: Vercel configuration

The project follows a modular architecture with clear separation between API layers, data models, and frontend components. The extensive template system suggests robust data import capabilities for inventory management operations.