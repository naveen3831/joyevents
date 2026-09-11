import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/service_model.dart';
import '../../services/service_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/service_card.dart';

class BrowseServicesScreen extends StatefulWidget {
  const BrowseServicesScreen({super.key});

  @override
  State<BrowseServicesScreen> createState() => _BrowseServicesScreenState();
}

class _BrowseServicesScreenState extends State<BrowseServicesScreen> {
  final ServiceService _serviceService = ServiceService();
  final _searchController = TextEditingController();

  List<ServiceModel> _services = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Catering',
    'Photography',
    'Decoration',
    'Music',
    'DJ',
    'Venue',
    'Makeup',
  ];

  @override
  void initState() {
    super.initState();
    _fetchServices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchServices() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _serviceService.getServices(
        category: _selectedCategory,
        search: _searchController.text,
      );
      if (mounted) {
        setState(() {
          _services = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(title: 'Browse Services'),
      body: Column(
        children: [
          // 1. Compact Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey.shade300, width: 1),
              ),
              child: TextField(
                controller: _searchController,
                onSubmitted: (_) => _fetchServices(),
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  hintText: 'Search services by name, provider...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AppTheme.accentColor,
                    size: 20,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _fetchServices();
                          },
                        )
                      : IconButton(
                          icon: const Icon(Icons.search_rounded, size: 18, color: AppTheme.accentColor),
                          onPressed: _fetchServices,
                        ),
                ),
              ),
            ),
          ),

          // 2. Compact Horizontal Category Filters
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return InkWell(
                  onTap: () {
                    if (_selectedCategory != cat) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                      _fetchServices();
                    }
                  },
                  borderRadius: BorderRadius.circular(18),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.accentColor : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isSelected ? AppTheme.accentColor : Colors.grey.shade300,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textColor,
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 10),

          // 3. Compact Services Grid Area
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchServices,
              child: _isLoading
                  ? const LoadingView(message: 'Loading services...')
                  : _errorMessage != null
                      ? ErrorView(message: _errorMessage!, onRetry: _fetchServices)
                      : _services.isEmpty
                          ? const EmptyState(
                              title: 'No Services Found',
                              message: 'No event services match your selected category or query.',
                              icon: Icons.miscellaneous_services_outlined,
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 2, 16, 20),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.74,
                              ),

                              itemCount: _services.length,
                              itemBuilder: (context, index) {
                                final service = _services[index];
                                return ServiceCard(
                                  service: service,
                                  onTap: () => context.push(
                                    '/customer/service-details/${service.id}',
                                    extra: service,
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}


